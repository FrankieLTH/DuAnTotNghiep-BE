/**
 * Helper quản lý đánh số phòng theo tầng (10 phòng/tầng) cho Đồi Bông Gòn Homestay
 * Quy tắc:
 *  - Dãy số phòng: [Tầng][Thứ tự phòng trong tầng (2 chữ số: 01 -> 10)]
 *  - Tầng 0 (trệt): 001, 002, ..., 010
 *  - Tầng 1: 101, 102, ..., 110
 *  - Tầng 2: 201, 202, ..., 210
 *  - Sau phòng thứ 10 của tầng (*10) -> nhảy lên tầng kế tiếp (*01)
 *  - Bỏ qua số chứa số 4 (VD: 004, 104, 204...) và số chứa/kết thúc 13 (VD: 113...)
 */

export interface ParsedRoomNumber {
  prefix: string;
  digitsStr: string;
  floor: number;
  indexInFloor: number;
}

export interface GeneratedRoomItem {
  id: string;
  room_number: string;
  special_features: string;
  isDuplicate: boolean;
}

/**
 * Định dạng số phòng dạng [Tầng][2 chữ số thứ tự (01 -> 10)]
 */
export function formatRoomDigits(floor: number, indexInFloor: number): string {
  const safeFloor = Math.max(0, floor);
  const safeIndex = Math.min(10, Math.max(1, indexInFloor));
  const indexStr = String(safeIndex).padStart(2, '0');
  return `${safeFloor}${indexStr}`;
}

/**
 * Tách một chuỗi số phòng thành Tiền tố và Phần số (floor + indexInFloor)
 * VD: "P001" -> prefix: "P", floor: 0, indexInFloor: 1, digitsStr: "001"
 *     "P110" -> prefix: "P", floor: 1, indexInFloor: 10, digitsStr: "110"
 *     "Villa-205" -> prefix: "Villa-", floor: 2, indexInFloor: 5, digitsStr: "205"
 */
export function parseRoomNumber(fullRoomNumber: string): ParsedRoomNumber {
  const raw = (fullRoomNumber || '').trim();
  const match = raw.match(/^([^\d]*)(\d+)$/);

  if (!match) {
    return {
      prefix: raw,
      digitsStr: '001',
      floor: 0,
      indexInFloor: 1,
    };
  }

  const prefix = match[1];
  const digitsStr = match[2];

  let floor = 0;
  let indexInFloor = 1;

  if (digitsStr.length >= 3) {
    indexInFloor = parseInt(digitsStr.slice(-2), 10);
    floor = parseInt(digitsStr.slice(0, -2), 10);
  } else {
    indexInFloor = parseInt(digitsStr, 10);
    floor = 0;
  }

  return {
    prefix,
    digitsStr,
    floor: isNaN(floor) ? 0 : floor,
    indexInFloor: isNaN(indexInFloor) || indexInFloor <= 0 ? 1 : indexInFloor,
  };
}

/**
 * Tách phần số dạng chuỗi (không có tiền tố)
 */
export function parseDigitsOnly(digitsStr: string): { floor: number; indexInFloor: number } {
  const parsed = parseRoomNumber(`ROOM${digitsStr}`);
  return { floor: parsed.floor, indexInFloor: parsed.indexInFloor };
}

/**
 * Kiểm tra xem chuỗi số phòng có vi phạm quy tắc kiêng kỵ hay không
 * - skip4: Chứa số 4 (ví dụ 004, 104, 401... đều bị bỏ qua)
 * - skip13: Chứa số 13 hoặc kết thúc bằng 13
 */
export function isTabooNumber(numStr: string, skip4 = true, skip13 = true): boolean {
  if (skip4 && numStr.includes('4')) {
    return true;
  }
  if (skip13 && (numStr.includes('13') || numStr.endsWith('13'))) {
    return true;
  }
  return false;
}

/**
 * Tìm số phòng kế tiếp hợp lệ theo quy tắc:
 * - Mỗi tầng có 10 phòng (01 -> 10).
 * - Sau phòng thứ 10 (*10) -> nhảy lên tầng kế tiếp (*01).
 * - Tự động bỏ qua số chứa 4 hoặc 13.
 */
export function getNextFloorRoomDigits(
  currentDigitsStr: string,
  skip4 = true,
  skip13 = true
): string {
  let { floor, indexInFloor } = parseDigitsOnly(currentDigitsStr);

  let safety = 0;
  while (safety < 1000) {
    safety++;
    if (indexInFloor < 10) {
      indexInFloor++;
    } else {
      floor++;
      indexInFloor = 1;
    }

    const candidateStr = formatRoomDigits(floor, indexInFloor);
    if (!isTabooNumber(candidateStr, skip4, skip13)) {
      return candidateStr;
    }
  }

  return formatRoomDigits(floor, indexInFloor);
}

/**
 * Quét danh sách phòng hiện có trong chi nhánh, tìm số phòng mới nhất/lớn nhất của tiền tố đó,
 * sau đó trả về số phòng bắt đầu kế tiếp (+1).
 */
export function findNextStartDigitsForPrefix(
  existingRoomNumbers: string[],
  prefix: string,
  skip4 = true,
  skip13 = true
): { latestRoom: string | null; nextDigits: string } {
  const cleanPrefix = (prefix || '').trim().toLowerCase();

  // Lọc các phòng bắt đầu bằng tiền tố
  const matching = existingRoomNumbers
    .map(rn => parseRoomNumber(rn))
    .filter(p => p.prefix.toLowerCase() === cleanPrefix);

  if (matching.length === 0) {
    // Chưa có phòng nào -> bắt đầu từ 001
    return { latestRoom: null, nextDigits: '001' };
  }

  // Tìm phòng có floor lớn nhất, sau đó indexInFloor lớn nhất
  matching.sort((a, b) => {
    if (a.floor !== b.floor) return b.floor - a.floor;
    return b.indexInFloor - a.indexInFloor;
  });

  const latest = matching[0];
  const nextDigits = getNextFloorRoomDigits(latest.digitsStr, skip4, skip13);

  return {
    latestRoom: `${latest.prefix}${latest.digitsStr}`,
    nextDigits,
  };
}

/**
 * Sinh danh sách count phòng liên tục theo quy tắc tầng (10 phòng/tầng) & bỏ qua số 4, 13
 */
export function generateFloorRoomsBatch(
  prefix: string,
  startDigitsStr: string,
  count: number,
  skip4 = true,
  skip13 = true,
  existingNumbers: string[] = []
): GeneratedRoomItem[] {
  const cleanPrefix = (prefix || '').trim();
  const existingSet = new Set(existingNumbers.map(n => n.trim().toLowerCase()));
  const result: GeneratedRoomItem[] = [];

  let { floor, indexInFloor } = parseDigitsOnly(startDigitsStr);
  let currentDigits = formatRoomDigits(floor, indexInFloor);

  // Nếu số bắt đầu bị dính số kiêng, tiến lên số hợp lệ đầu tiên
  if (isTabooNumber(currentDigits, skip4, skip13)) {
    currentDigits = getNextFloorRoomDigits(currentDigits, skip4, skip13);
  }

  let safety = 0;
  while (result.length < count && safety < 2000) {
    safety++;
    const fullRoomNumber = `${cleanPrefix}${currentDigits}`;
    const isDuplicate = existingSet.has(fullRoomNumber.toLowerCase());

    result.push({
      id: `gen-${fullRoomNumber}-${Date.now()}-${Math.random()}`,
      room_number: fullRoomNumber,
      special_features: '',
      isDuplicate,
    });

    if (result.length < count) {
      currentDigits = getNextFloorRoomDigits(currentDigits, skip4, skip13);
    }
  }

  return result;
}

/**
 * Hàm sắp xếp danh sách phòng tự nhiên (Natural Sort theo Tiền tố -> Tầng -> Số thứ tự)
 */
export function sortRoomsNatural<T extends { room_number: string }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const pA = parseRoomNumber(a.room_number);
    const pB = parseRoomNumber(b.room_number);

    // 1. So sánh tiền tố
    const prefixCmp = pA.prefix.localeCompare(pB.prefix, 'vi', { sensitivity: 'base' });
    if (prefixCmp !== 0) return prefixCmp;

    // 2. So sánh tầng
    if (pA.floor !== pB.floor) return pA.floor - pB.floor;

    // 3. So sánh thứ tự trong tầng
    return pA.indexInFloor - pB.indexInFloor;
  });
}
