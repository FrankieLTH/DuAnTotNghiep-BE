/**
 * project/shared/rooms.ts
 * Hàm thuần (pure functions) quản lý phòng – không gọi DB, không import thư viện ngoài.
 * Dùng chung cho backend NestJS, frontend React, và Simulator Store.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RoomBlock {
  id: number;
  room_id: number;
  from_at: Date | string;
  to_at: Date | string | null;
  reason: string;
}

export type RoomDisplayStatus = 'Bảo trì' | 'Đang lưu trú' | 'Cần dọn dẹp' | 'Sẵn sàng';

export interface ParsedRoomNumberToken {
  type: 'single' | 'range';
  roomNumbers: string[];
  error?: string;
}

export interface ParseRoomNumberResult {
  roomNumbers: string[];
  errors: string[];
}

export interface GenerateRoomNumbersOptions {
  prefix: string;
  floorFrom: number;
  floorTo: number;
  perFloor: number;
  startIndex?: number;
  skipNumbers?: string[]; // mảng pattern cần bỏ qua, mặc định ["4", "13"]
}

export interface BatchRoomGroup {
  label: string;
  roomGroupId?: number | string | null;
  roomTypeId: number;
  featureIds: number[];
  note?: string;
  roomNumbers: string[];
}

export interface BatchCommonConfig {
  prefix?: string;
  defaultStatus?: 'available' | 'maintenance';
  commonFeatureIds: number[];
}

export interface BatchRoomPlan {
  roomNumber: string;
  floor: number | null;
  roomGroupId?: number | string | null;
  roomTypeId: number;
  featureIds: number[];     // merged: common + group (deduped)
  note?: string;
  label: string;             // group label for reference
}

export interface BatchPlanResult {
  plan: BatchRoomPlan[];
  duplicatesWithinBatch: string[];  // số phòng trùng giữa các nhóm
  errors: string[];
}

export interface AggregatedFeature {
  featureId: number;
  scope: 'all' | 'some';
}

// ============================================================================
// 1. normalizeRoomNumber – trim + viết hoa
// ============================================================================

export function normalizeRoomNumber(s: string): string {
  return s.trim().toUpperCase();
}

// ============================================================================
// 2. suggestFloor – suy tầng từ số phòng
//    P203 → 2 | B102 → 1 | 001 → 0 | "Bali" → null
// ============================================================================

export function suggestFloor(roomNumber: string): number | null {
  const normalized = normalizeRoomNumber(roomNumber);
  // Lấy phần số cuối cùng trong chuỗi
  const match = normalized.match(/(\d+)$/);
  if (!match) return null;

  const digits = match[1];
  if (digits.length < 2) return null;

  // Phần trăm → tầng (3 chữ số trở lên: bỏ 2 chữ số cuối = tầng)
  if (digits.length >= 3) {
    const floorPart = digits.slice(0, digits.length - 2);
    const floor = parseInt(floorPart, 10);
    return isNaN(floor) ? null : floor;
  }

  // 2 chữ số (VD: 01-10): tầng 0 (trệt)
  return 0;
}

// ============================================================================
// 3. parseRoomNumberInput – phân tích chuỗi nhập tự do
//    "201, 210" / "202-209" / "101-103, 105-110" / "P101" / mixed
//    Trả danh sách đã chuẩn hóa, loại trùng trong nhóm, báo lỗi theo token
// ============================================================================

const MAX_RANGE_SIZE = 100;

export function parseRoomNumberInput(text: string, prefix: string = ''): ParseRoomNumberResult {
  const roomNumbers: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  if (!text || !text.trim()) {
    return { roomNumbers: [], errors: [] };
  }

  // Tách token theo dấu phẩy hoặc xuống dòng
  const tokens = text.split(/[,\n]+/).map(t => t.trim()).filter(t => t.length > 0);

  for (const token of tokens) {
    // Thử match dải số: "101-110" hoặc "P101-P110" hoặc "101-110"
    const rangeMatch = token.match(/^([A-Za-z]*?)(\d+)\s*-\s*([A-Za-z]*?)(\d+)$/);
    if (rangeMatch) {
      const prefixA = rangeMatch[1].toUpperCase();
      const numA = parseInt(rangeMatch[2], 10);
      const prefixB = rangeMatch[3].toUpperCase();
      const numB = parseInt(rangeMatch[4], 10);

      // Tiền tố hai đầu phải giống nhau (hoặc đều trống)
      if (prefixA !== prefixB && !(prefixA === '' && prefixB === '')) {
        errors.push(`Token "${token}": tiền tố hai đầu không khớp (${prefixA} vs ${prefixB})`);
        continue;
      }

      if (numA > numB) {
        errors.push(`Token "${token}": số bắt đầu (${numA}) lớn hơn số kết thúc (${numB})`);
        continue;
      }

      const rangeSize = numB - numA + 1;
      if (rangeSize > MAX_RANGE_SIZE) {
        errors.push(`Token "${token}": dải quá lớn (${rangeSize} > ${MAX_RANGE_SIZE})`);
        continue;
      }

      const usedPrefix = prefixA || prefix.toUpperCase();
      const padLength = Math.max(rangeMatch[2].length, rangeMatch[4].length);

      for (let n = numA; n <= numB; n++) {
        const rn = normalizeRoomNumber(usedPrefix + String(n).padStart(padLength, '0'));
        if (!seen.has(rn)) {
          seen.add(rn);
          roomNumbers.push(rn);
        }
      }
      continue;
    }

    // Thử match số phòng đơn: "P101" / "101" / "B-201"
    const singleMatch = token.match(/^([A-Za-z\-]*)(\d+)$/) || token.match(/^(\d+)$/);
    if (singleMatch) {
      const rawPrefix = (singleMatch.length === 3 ? singleMatch[1] : '').toUpperCase();
      const usedPrefix = rawPrefix || prefix.toUpperCase();
      const digits = singleMatch[singleMatch.length - 1];
      const rn = normalizeRoomNumber(usedPrefix + digits);
      if (!seen.has(rn)) {
        seen.add(rn);
        roomNumbers.push(rn);
      }
      continue;
    }

    errors.push(`Token "${token}": cú pháp không hợp lệ (dùng "P101" hoặc "101-110")`);
  }

  return { roomNumbers, errors };
}

// ============================================================================
// 4. generateRoomNumbers – sinh theo cấu hình tầng (cách cũ, giữ lại)
//    skipNumbers: mảng pattern chuỗi cần bỏ qua, mặc định ["4","13"]
// ============================================================================

export function generateRoomNumbers(options: GenerateRoomNumbersOptions): string[] {
  const {
    prefix,
    floorFrom,
    floorTo,
    perFloor,
    startIndex = 1,
    skipNumbers = ['4', '13'],
  } = options;

  const results: string[] = [];

  for (let floor = floorFrom; floor <= floorTo; floor++) {
    let count = 0;
    let index = floor === floorFrom ? startIndex : 1;

    while (count < perFloor && index <= 99) {
      const digits = floor === 0
        ? String(index).padStart(2, '0')
        : `${floor}${String(index).padStart(2, '0')}`;

      const isSkipped = skipNumbers.some(pattern => digits.includes(pattern));

      if (!isSkipped) {
        results.push(normalizeRoomNumber(prefix + digits));
        count++;
      }
      index++;
    }
  }

  return results;
}

// ============================================================================
// 5. buildBatchPlan – gộp các nhóm, phát hiện trùng, merge đặc điểm
// ============================================================================

export function buildBatchPlan(groups: BatchRoomGroup[], common: BatchCommonConfig): BatchPlanResult {
  const plan: BatchRoomPlan[] = [];
  const duplicatesWithinBatch: string[] = [];
  const errors: string[] = [];
  const globalSeen = new Map<string, string>(); // roomNumber → groupLabel

  for (const group of groups) {
    // Merge featureIds: common ∪ group (loại trùng)
    const mergedFeatureIds = Array.from(new Set([
      ...(common.commonFeatureIds || []),
      ...(group.featureIds || []),
    ]));

    for (const rawRn of group.roomNumbers) {
      const rn = normalizeRoomNumber(rawRn);
      if (!rn) continue;

      if (globalSeen.has(rn)) {
        duplicatesWithinBatch.push(rn);
        errors.push(`Số phòng "${rn}" trùng giữa nhóm "${globalSeen.get(rn)}" và nhóm "${group.label}"`);
        continue;
      }

      globalSeen.set(rn, group.label);

      const floor = suggestFloor(rn);

      plan.push({
        roomNumber: rn,
        floor,
        roomGroupId: group.roomGroupId ?? null,
        roomTypeId: group.roomTypeId,
        featureIds: mergedFeatureIds,
        note: group.note,
        label: group.label,
      });
    }
  }

  return { plan, duplicatesWithinBatch, errors };
}

// ============================================================================
// 6. computeRoomDisplayStatus – tính nhãn hiển thị theo ưu tiên
//    Bảo trì > Đang lưu trú > Cần dọn dẹp > Sẵn sàng
// ============================================================================

export function computeRoomDisplayStatus(
  room: { housekeeping: 'clean' | 'dirty' },
  activeBlocks: RoomBlock[],
  hasCheckedInBooking: boolean,
  now: Date = new Date(),
): RoomDisplayStatus {
  // 1. Bảo trì: có room_block đang hiệu lực
  const isBlocked = activeBlocks.some(block => {
    const from = new Date(block.from_at);
    const to = block.to_at ? new Date(block.to_at) : null;
    return from <= now && (to === null || to > now);
  });
  if (isBlocked) return 'Bảo trì';

  // 2. Đang lưu trú: có booking checked_in gắn vào phòng
  if (hasCheckedInBooking) return 'Đang lưu trú';

  // 3. Cần dọn dẹp
  if (room.housekeeping === 'dirty') return 'Cần dọn dẹp';

  // 4. Sẵn sàng
  return 'Sẵn sàng';
}

// ============================================================================
// 7. aggregateRoomTypeFeatures – tổng hợp đặc điểm theo loại phòng (phía khách)
//    all: mọi phòng hoạt động của loại đều có feature
//    some: chỉ một số phòng có
// ============================================================================

export function aggregateRoomTypeFeatures(
  rooms: Array<{ feature_ids?: number[]; is_hidden: boolean; deleted_at?: Date | string | null }>,
): AggregatedFeature[] {
  const activeRooms = rooms.filter(r => !r.is_hidden && !r.deleted_at);
  if (activeRooms.length === 0) return [];

  // Đếm số phòng có mỗi feature
  const featureCount = new Map<number, number>();
  for (const room of activeRooms) {
    for (const fid of room.feature_ids ?? []) {
      featureCount.set(fid, (featureCount.get(fid) ?? 0) + 1);
    }
  }

  const result: AggregatedFeature[] = [];
  for (const [featureId, count] of featureCount.entries()) {
    result.push({
      featureId,
      scope: count === activeRooms.length ? 'all' : 'some',
    });
  }

  return result;
}

// ============================================================================
// 8. sortRoomsNatural – sắp xếp theo floor rồi room_number
// ============================================================================

export function sortRoomsNatural<T extends { floor: number; room_number: string }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' });
  });
}
