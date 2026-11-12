// ========================================================
// SHARED ROOM BASKETS ENGINE (DETERMINISTIC, ZERO SCORING, ZERO DB)
// ========================================================

export const STAY_TYPE_FACTORS: Record<
  string,
  { factor: number; checkIn: string; checkOut: string; name: string }
> = {
  overnight: { factor: 0.7, checkIn: '19:00', checkOut: '12:00', name: 'Qua đêm' },
  daytime: { factor: 0.7, checkIn: '07:00', checkOut: '17:00', name: 'Trong ngày' },
  fullday: { factor: 1.0, checkIn: '14:00', checkOut: '12:00', name: 'Qua ngày' },
};

/**
 * Tính số đêm giữa 2 ngày (YYYY-MM-DD). Tối thiểu là 1 đêm/ngày.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diffDays) ? 1 : diffDays);
}

/**
 * Tính đơn giá cho 1 phòng theo loại lưu trú và khoảng ngày
 */
export function calculateRoomPrice(
  basePrice: number,
  stayType: string = 'fullday',
  checkIn: string,
  checkOut: string
): {
  unitPrice: number;
  nights: number;
  priceFactor: number;
} {
  const normType = stayType?.toLowerCase() || 'fullday';
  const cfg = STAY_TYPE_FACTORS[normType] || STAY_TYPE_FACTORS.fullday;
  const nights = normType === 'daytime' ? 1 : calculateNights(checkIn, checkOut);
  const priceFactor = cfg.factor;
  const unitPrice = Math.round(basePrice * priceFactor * nights);

  return { unitPrice, nights, priceFactor };
}

export interface VoucherRule {
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value?: number;
}

/**
 * Tính số tiền giảm giá từ voucher
 */
export function calculateVoucherDiscount(
  orderSubtotal: number,
  voucher?: VoucherRule | null
): number {
  if (!voucher || orderSubtotal <= 0) return 0;
  if (voucher.min_order_value && orderSubtotal < voucher.min_order_value) return 0;

  let discount = 0;
  if (voucher.discount_type === 'percentage') {
    discount = (orderSubtotal * voucher.discount_value) / 100;
    if (voucher.max_discount_amount && voucher.max_discount_amount > 0) {
      discount = Math.min(discount, voucher.max_discount_amount);
    }
  } else {
    discount = voucher.discount_value;
  }

  return Math.min(orderSubtotal, Math.round(discount));
}

export interface SearchCriteria {
  apartmentId?: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  stayType: string; // 'overnight' | 'daytime' | 'fullday'
  adults: number; // >= 15 tuổi, tối thiểu 1
  children: number; // < 15 tuổi, không tính sức chứa
  rooms: number; // 1 <= rooms <= adults
  voucherCode?: string;
  sort?: 'default' | 'price_asc' | 'price_desc';
}

export interface AvailableRoomType {
  roomTypeId: number;
  apartmentId: number;
  apartmentName?: string;
  name: string;
  maxOccupancy: number; // Sức chứa người lớn
  basePrice: number;
  availableCount: number; // Số phòng còn trống
  area?: number;
  bedConfig?: string;
  image?: string;
  specialFeatures?: string;
}

export interface BasketGuestSlot {
  adults: number;
  children: number;
}

export interface BasketItem {
  roomTypeId: number;
  roomTypeName: string;
  quantity: number;
  area?: number;
  bedConfig?: string;
  image?: string;
  basePrice: number;
  unitPrice: number; // Đơn giá trọn kỳ lưu trú cho 1 phòng loại này
  specialFeatures?: string;
  hasExtraMattress?: boolean;
  extraMattressFee?: number;
  guests: BasketGuestSlot[];
}

export interface Basket {
  id: string;
  items: BasketItem[];
  totalRooms: number;
  totalCapacity: number;
  spare: number; // totalCapacity - adults
  nightlyPrice: number; // Giá trung bình 1 đêm cho cả giỏ
  totalPrice: number; // Tổng giá sau khi trừ voucher (nếu có)
  extraMattressTotal?: number;
  discountAmount?: number;
  tags: ('exact_fit' | 'cheapest' | 'best_value')[];
  reasons: string[];
  relaxed?: {
    field: 'apartment' | 'date' | 'stayType' | 'rooms' | 'spare';
    note: string;
  };
}

export interface BasketConfig {
  maxSpare: number; // default: 3
  maxBaskets: number; // default: 8
  maxCombos: number; // default: 200
}

export const DEFAULT_BASKET_CONFIG: BasketConfig = {
  maxSpare: 3,
  maxBaskets: 8,
  maxCombos: 200,
};

// Type alias cho BookingRoom để tương thích hoàn toàn với database Booking_rooms
export interface BookingRoomItem {
  id?: number;
  booking_id?: number;
  room_types_id: number;
  room_id?: number | null;
  adults: number;
  children: number;
  unit_price: number;
}
export type BookingItem = BookingRoomItem;

/**
 * Sinh tổ hợp N phòng từ danh sách loại phòng có lặp lại, không phân biệt thứ tự [A, B] == [B, A]
 */
export function generateCombos(
  types: AvailableRoomType[],
  n: number,
  cfg: BasketConfig = DEFAULT_BASKET_CONFIG
): AvailableRoomType[][] {
  const combos: AvailableRoomType[][] = [];
  if (types.length === 0 || n <= 0) return combos;

  function recurse(startIdx: number, current: AvailableRoomType[]) {
    if (combos.length >= cfg.maxCombos) return;
    if (current.length === n) {
      combos.push([...current]);
      return;
    }

    for (let i = startIdx; i < types.length; i++) {
      current.push(types[i]);
      recurse(i, current); // Cho phép lặp loại phòng (i thay vì i + 1)
      current.pop();
    }
  }

  recurse(0, []);
  return combos;
}

/**
 * Phân bổ khách vào từng phòng trong tổ hợp
 * - Mỗi phòng nhận 1 người lớn trước (đảm bảo phòng nào cũng có người lớn >= 15t)
 * - Người lớn còn lại chia vào phòng còn nhiều chỗ nhất, không vượt maxOccupancy
 * - Trẻ em chia vào các phòng (ưu tiên phòng rộng hơn, không ảnh hưởng sức chứa)
 */
export function distributeGuests(
  combo: AvailableRoomType[],
  adults: number,
  children: number
): BasketGuestSlot[] | null {
  const n = combo.length;
  if (adults < n) return null; // Mỗi phòng bắt buộc có ít nhất 1 người lớn

  // Khởi tạo mỗi phòng 1 người lớn
  const slots: BasketGuestSlot[] = combo.map(() => ({ adults: 1, children: 0 }));
  let remainingAdults = adults - n;

  // Chia người lớn còn lại
  while (remainingAdults > 0) {
    // Tìm phòng còn dư chỗ nhiều nhất
    let bestIdx = -1;
    let maxRemainingCapacity = -1;

    for (let i = 0; i < n; i++) {
      const roomCapacity = combo[i].maxOccupancy;
      const current = slots[i].adults;
      const remainingSpace = roomCapacity - current;

      if (remainingSpace > 0 && remainingSpace > maxRemainingCapacity) {
        maxRemainingCapacity = remainingSpace;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      // Không còn phòng nào chứa được thêm người lớn mà không vượt maxOccupancy
      return null;
    }

    slots[bestIdx].adults += 1;
    remainingAdults -= 1;
  }

  // Chia trẻ em (< 15 tuổi) lần lượt vào các phòng
  let remainingChildren = children;
  let childIdx = 0;
  while (remainingChildren > 0) {
    slots[childIdx % n].children += 1;
    remainingChildren -= 1;
    childIdx += 1;
  }

  return slots;
}

/**
 * Xây dựng các lý do đề xuất khách quan từ dữ kiện thật (không bịa)
 */
export function buildReasons(
  combo: AvailableRoomType[],
  slots: BasketGuestSlot[],
  spare: number,
  adults: number
): string[] {
  const reasons: string[] = [];

  if (spare === 0) {
    reasons.push(`Vừa đủ chuẩn cho ${adults} người lớn (0 chỗ thừa)`);
  } else {
    reasons.push(`Dư ${spare} chỗ nghỉ thoải mái cho đoàn`);
  }

  // Kiểm tra độ khan hiếm phòng
  for (const rt of combo) {
    if (rt.availableCount > 0 && rt.availableCount <= 2) {
      const reason = `Chỉ còn ${rt.availableCount} phòng ${rt.name}`;
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  // Kiểm tra đặc điểm giường/tiện ích
  const hasKing = combo.some((rt) => rt.bedConfig?.toLowerCase().includes('king') || rt.bedConfig?.includes('1m8'));
  if (hasKing && !reasons.includes('Có phòng giường King 1m8 rộng rãi')) {
    reasons.push('Có phòng giường King 1m8 rộng rãi');
  }

  const hasSpecial = combo.some((rt) => rt.specialFeatures && rt.specialFeatures.trim().length > 0);
  if (hasSpecial) {
    const feat = combo.find((rt) => rt.specialFeatures)?.specialFeatures;
    if (feat) reasons.push(`Đặc điểm nổi bật: ${feat}`);
  }

  return reasons.slice(0, 3);
}

/**
 * Xây dựng danh sách Giỏ phòng (Room Baskets)
 */
export function buildBaskets(
  criteria: SearchCriteria,
  availability: AvailableRoomType[],
  cfg: BasketConfig = DEFAULT_BASKET_CONFIG,
  voucher?: VoucherRule | null
): Basket[] {
  const n = criteria.rooms || 1;
  const adults = criteria.adults || 1;
  const children = criteria.children || 0;

  // Điều kiện tiên quyết: số phòng không thể nhiều hơn số người lớn
  if (n > adults || n <= 0 || adults <= 0) return [];

  // Bước 1: Lọc loại phòng còn trống (availableCount >= 1)
  const validTypes = availability.filter((rt) => rt.availableCount >= 1);
  if (validTypes.length === 0) return [];

  // Bước 2: Sinh tổ hợp đúng N phòng
  const rawCombos = generateCombos(validTypes, n, cfg);

  // Lọc tổ hợp thỏa mãn số lượng có sẵn và sức chứa
  const validCombosWithSlots: {
    combo: AvailableRoomType[];
    slots: BasketGuestSlot[];
    spare: number;
    totalCapacity: number;
  }[] = [];

  for (const combo of rawCombos) {
    // 1. Kiểm tra quantity từng loại phòng <= availableCount
    const countMap = new Map<number, number>();
    for (const rt of combo) {
      countMap.set(rt.roomTypeId, (countMap.get(rt.roomTypeId) || 0) + 1);
    }

    let isCountOk = true;
    for (const [rtId, count] of countMap.entries()) {
      const rt = validTypes.find((t) => t.roomTypeId === rtId);
      if (!rt || count > rt.availableCount) {
        isCountOk = false;
        break;
      }
    }
    if (!isCountOk) continue;

    // 2. Kiểm tra sức chứa
    const totalCapacity = combo.reduce((sum, rt) => sum + rt.maxOccupancy, 0);
    if (totalCapacity < adults) continue;

    const spare = totalCapacity - adults;
    if (spare < 0 || spare > cfg.maxSpare) continue; // Quy tắc lọc chính: 0 <= spare <= maxSpare (3)

    // 3. Bước 3: Chia khách
    const slots = distributeGuests(combo, adults, children);
    if (!slots) continue;

    validCombosWithSlots.push({
      combo,
      slots,
      spare,
      totalCapacity,
    });
  }

  if (validCombosWithSlots.length === 0) return [];

  // Bước 4: Tính giá và gom nhóm thành Basket
  const baskets: Basket[] = [];
  const nights = calculateNights(criteria.checkIn, criteria.checkOut);

  let basketCounter = 1;
  for (const item of validCombosWithSlots) {
    const { combo, slots, spare, totalCapacity } = item;

    // Gom các phòng cùng loại thành BasketItem
    const groupMap = new Map<number, { rt: AvailableRoomType; qty: number; guests: BasketGuestSlot[] }>();
    for (let i = 0; i < combo.length; i++) {
      const rt = combo[i];
      const slot = slots[i];
      if (!groupMap.has(rt.roomTypeId)) {
        groupMap.set(rt.roomTypeId, { rt, qty: 1, guests: [slot] });
      } else {
        const existing = groupMap.get(rt.roomTypeId)!;
        existing.qty += 1;
        existing.guests.push(slot);
      }
    }

    let subtotalPrice = 0;
    const basketItems: BasketItem[] = [];

    for (const group of groupMap.values()) {
      const { unitPrice } = calculateRoomPrice(
        group.rt.basePrice,
        criteria.stayType,
        criteria.checkIn,
        criteria.checkOut
      );
      const totalItemPrice = unitPrice * group.qty;
      subtotalPrice += totalItemPrice;

      basketItems.push({
        roomTypeId: group.rt.roomTypeId,
        roomTypeName: group.rt.name,
        quantity: group.qty,
        area: group.rt.area,
        bedConfig: group.rt.bedConfig,
        image: group.rt.image,
        basePrice: group.rt.basePrice,
        unitPrice,
        specialFeatures: group.rt.specialFeatures,
        guests: group.guests,
      });
    }

    const discount = calculateVoucherDiscount(subtotalPrice, voucher);
    const finalTotalPrice = Math.max(0, subtotalPrice - discount);
    const nightlyPrice = Math.round(finalTotalPrice / nights);

    const reasons = buildReasons(combo, slots, spare, adults);

    baskets.push({
      id: `basket_${basketCounter++}`,
      items: basketItems,
      totalRooms: n,
      totalCapacity,
      spare,
      nightlyPrice,
      totalPrice: finalTotalPrice,
      discountAmount: discount > 0 ? discount : undefined,
      tags: [],
      reasons,
    });
  }

  // Khử trùng lặp tổ hợp (loại bỏ các giỏ có cùng tập hợp roomTypeId và quantity)
  const uniqueBaskets: Basket[] = [];
  const seenCombos = new Set<string>();

  for (const b of baskets) {
    const signature = b.items
      .map((it) => `${it.roomTypeId}x${it.quantity}`)
      .sort()
      .join('|');
    if (!seenCombos.has(signature)) {
      seenCombos.add(signature);
      uniqueBaskets.push(b);
    }
  }

  // Sắp xếp
  if (criteria.sort === 'price_asc') {
    uniqueBaskets.sort((a, b) => a.totalPrice - b.totalPrice);
  } else if (criteria.sort === 'price_desc') {
    uniqueBaskets.sort((a, b) => b.totalPrice - a.totalPrice);
  } else {
    // Mặc định: spare tăng dần, sau đó totalPrice tăng dần
    uniqueBaskets.sort((a, b) => {
      if (a.spare !== b.spare) return a.spare - b.spare;
      return a.totalPrice - b.totalPrice;
    });
  }

  // Cắt tối đa maxBaskets (8)
  const finalBaskets = uniqueBaskets.slice(0, cfg.maxBaskets);

  if (finalBaskets.length > 0) {
    // Gắn tag exact_fit (spare == 0)
    for (const b of finalBaskets) {
      if (b.spare === 0) b.tags.push('exact_fit');
    }

    // Gắn tag cheapest cho giỏ có giá thấp nhất
    let minPriceBasket = finalBaskets[0];
    for (const b of finalBaskets) {
      if (b.totalPrice < minPriceBasket.totalPrice) {
        minPriceBasket = b;
      }
    }
    if (!minPriceBasket.tags.includes('cheapest')) {
      minPriceBasket.tags.push('cheapest');
    }
  }

  return finalBaskets;
}

/**
 * Fallback khi không có giỏ nào phù hợp với điều kiện ban đầu
 * Thử lần lượt 5 cấp độ nới lỏng, dừng khi có kết quả (tối đa 3 giỏ):
 * 1. Nới sức chứa dư (spare > 3 lên 5 hoặc 6)
 * 2. Nới số phòng (rooms + 1 để tách khách)
 * 3. Đổi stay_type (fullday / overnight)
 */
export function fallbackBaskets(
  criteria: SearchCriteria,
  availability: AvailableRoomType[],
  cfg: BasketConfig = DEFAULT_BASKET_CONFIG,
  voucher?: VoucherRule | null
): Basket[] {
  // 1. Thử nới spare lên 6
  const relaxedCfg: BasketConfig = { ...cfg, maxSpare: 6, maxBaskets: 3 };
  const resSpare = buildBaskets(criteria, availability, relaxedCfg, voucher);
  if (resSpare.length > 0) {
    return resSpare.map((b) => ({
      ...b,
      relaxed: {
        field: 'spare',
        note: `Đề xuất không gian rộng hơn (Dư ${b.spare} chỗ nghỉ)`,
      },
    }));
  }

  // 2. Thử nới số phòng (rooms + 1 nếu adults >= rooms + 1)
  if (criteria.adults >= (criteria.rooms || 1) + 1) {
    const resRooms = buildBaskets(
      { ...criteria, rooms: (criteria.rooms || 1) + 1 },
      availability,
      cfg,
      voucher
    );
    if (resRooms.length > 0) {
      return resRooms.slice(0, 3).map((b) => ({
        ...b,
        relaxed: {
          field: 'rooms',
          note: `Đề xuất tách thêm thành ${criteria.rooms + 1} phòng để nghỉ ngơi thoải mái hơn`,
        },
      }));
    }
  }

  // 3. Thử đổi stay_type nếu đang là daytime/overnight
  if (criteria.stayType !== 'fullday') {
    const resStayType = buildBaskets(
      { ...criteria, stayType: 'fullday' },
      availability,
      cfg,
      voucher
    );
    if (resStayType.length > 0) {
      return resStayType.slice(0, 3).map((b) => ({
        ...b,
        relaxed: {
          field: 'stayType',
          note: 'Đề xuất chuyển sang gói lưu trú Qua ngày (14:00 → 12:00)',
        },
      }));
    }
  }

  return [];
}
