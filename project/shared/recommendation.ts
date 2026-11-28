// ========================================================
// SHARED ROOM RECOMMENDATION ENGINE (PURE FUNCTIONS, ZERO DB)
// ========================================================

export interface SearchCriteria {
  apartmentId?: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  stayType: 'overnight' | 'daytime' | 'fullday' | string;
  adults: number; // >= 15 tuổi, tối thiểu 1
  children: number; // < 15 tuổi, không tính sức chứa
  rooms: number; // Số phòng muốn đặt (1 <= rooms <= adults)
  autoRooms?: boolean;
  voucherCode?: string;
  sort?: 'default' | 'price_asc' | 'price_desc';
}

export interface AvailableRoomType {
  variantKey?: string;
  parentId?: number;
  variantGroup?: string;
  variantLabel?: string;
  roomIds?: number[];
  featurePricePerNight?: number;
  features?: {id:number;name:string;extra_price_per_night:number}[];
  roomTypeId: number;
  roomId?: number;
  apartmentId: number;
  apartmentName?: string;
  name: string;
  maxOccupancy: number; // Chỉ tính cho người lớn
  basePrice: number;
  availableCount: number; // Số phòng còn trống
  area?: number;
  bedConfig?: string;
  image?: string;
}

export interface RoomPlanItem {
  roomIds?: number[];
  features?: {id:number;name:string;extra_price_per_night:number}[];
  featurePricePerNight?: number;
  roomTypeId: number;
  name?: string;
  quantity: number;
  basePrice: number;
  maxOccupancy: number;
  availableCount: number;
  area?: number;
  bedConfig?: string;
  image?: string;
  guests: {
    adults: number;
    children: number;
  }[];
}

export interface Recommendation {
  id: string;
  label: 'best_match' | 'cheapest' | 'most_comfortable' | 'alternative';
  items: RoomPlanItem[];
  totalRooms: number;
  totalCapacity: number;
  totalPrice: number;
  score: number;
  reasons: string[];
  relaxed?: {
    field: 'apartment' | 'date' | 'stayType' | 'rooms';
    note: string;
  };
}

export interface ScoringWeights {
  fit: number;
  price: number;
  bed: number;
  split: number;
}

export interface ScoringConfig {
  weights: ScoringWeights;
  maxPlans: number;
  topN: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    fit: 35,
    price: 35,
    bed: 15,
    split: 15,
  },
  maxPlans: 20,
  topN: 3,
};

export const STAY_TYPE_FACTORS: Record<string, { factor: number; checkIn: string; checkOut: string; name: string }> = {
  overnight: { factor: 0.7, checkIn: '19:00', checkOut: '12:00', name: 'Qua đêm' },
  daytime: { factor: 0.7, checkIn: '07:00', checkOut: '17:00', name: 'Trong ngày' },
  daily: { factor: 0.7, checkIn: '07:00', checkOut: '17:00', name: 'Trong ngày' },
  fullday: { factor: 1.0, checkIn: '14:00', checkOut: '12:00', name: 'Qua ngày' },
  extended: { factor: 1.0, checkIn: '14:00', checkOut: '12:00', name: 'Qua ngày' },
};

/**
 * Tính toán khung giờ lưu trú chính xác theo loại hình và ngày check-in/out
 */
export function computeStayWindow(
  checkIn: string,
  checkOut: string,
  stayType: string,
  stayConfig = STAY_TYPE_FACTORS
): {
  startAt: string;
  endAt: string;
  nightsOrDays: number;
  priceFactor: number;
  name: string;
} {
  const normType = (stayType || 'overnight').toLowerCase();
  const cfg = stayConfig[normType] || STAY_TYPE_FACTORS.overnight;

  const inDate = checkIn ? checkIn.split('T')[0] : new Date().toISOString().split('T')[0];
  let outDate = checkOut ? checkOut.split('T')[0] : inDate;

  let nightsOrDays = 1;
  const startAt = `${inDate}T${cfg.checkIn}:00`;

  if (normType === 'daytime' || normType === 'daily') {
    // Trong ngày: nhận và trả trong cùng ngày
    const endAt = `${inDate}T${cfg.checkOut}:00`;
    return {
      startAt,
      endAt,
      nightsOrDays: 1,
      priceFactor: cfg.factor,
      name: cfg.name,
    };
  }

  // Overnight / Fullday
  const sDate = new Date(inDate);
  const eDate = new Date(outDate);
  const diffDays = Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
  nightsOrDays = diffDays;

  // Nếu outDate trùng inDate, tự cộng thêm 1 ngày
  if (outDate <= inDate) {
    const nextDay = new Date(sDate.getTime() + 86400000);
    outDate = nextDay.toISOString().split('T')[0];
    nightsOrDays = 1;
  }

  const endAt = `${outDate}T${cfg.checkOut}:00`;

  return {
    startAt,
    endAt,
    nightsOrDays,
    priceFactor: cfg.factor,
    name: cfg.name,
  };
}

/**
 * Kiểm tra 2 khoảng thời gian có giao nhau không (Datetime đầy đủ)
 * Overlap khi: startA < endB && endA > startB
 */
export function isOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && eA > sB;
}

/**
 * Phân bổ khách (người lớn >=15 tuổi, trẻ em <15 tuổi) đều vào từng phòng
 * Điều kiện: Mỗi phòng PHẢI có ít nhất 1 người lớn
 */
export function distributeGuests(
  totalAdults: number,
  totalChildren: number,
  roomsCount: number
): { adults: number; children: number }[] {
  if (roomsCount <= 0) return [];
  const rooms: { adults: number; children: number }[] = [];

  // Rải người lớn đều trước (đảm bảo mỗi phòng >= 1)
  const baseAdults = Math.floor(totalAdults / roomsCount);
  let remAdults = totalAdults % roomsCount;

  // Rải trẻ em đều sau
  const baseChildren = Math.floor(totalChildren / roomsCount);
  let remChildren = totalChildren % roomsCount;

  for (let i = 0; i < roomsCount; i++) {
    const rAdults = baseAdults + (remAdults > 0 ? 1 : 0);
    if (remAdults > 0) remAdults--;

    const rChildren = baseChildren + (remChildren > 0 ? 1 : 0);
    if (remChildren > 0) remChildren--;

    rooms.push({
      adults: Math.max(1, rAdults),
      children: rChildren,
    });
  }

  return rooms;
}

/**
 * Sinh các phương án phòng (plans)
 */
export function buildPlans(
  criteria: SearchCriteria,
  availableRoomTypes: AvailableRoomType[],
  config = DEFAULT_SCORING_CONFIG
): {
  items: RoomPlanItem[];
  totalRooms: number;
  totalCapacity: number;
  totalPrice: number;
  averageArea: number;
  distinctTypesCount: number;
  hasBedPreferenceMatch: boolean;
}[] {
  const { adults, rooms, stayType, checkIn, checkOut } = criteria;
  if (!availableRoomTypes || availableRoomTypes.length === 0 || rooms < 1 || adults < rooms) {
    return [];
  }

  const stayWindow = computeStayWindow(checkIn, checkOut, stayType);
  const factor = stayWindow.priceFactor;
  const nights = stayWindow.nightsOrDays;

  // Lọc chỉ lấy các loại phòng còn trống > 0
  const validTypes = availableRoomTypes.filter((rt) => rt.availableCount > 0);
  if (validTypes.length === 0) return [];

  const rawPlans: {
    items: RoomPlanItem[];
    totalRooms: number;
    totalCapacity: number;
    totalPrice: number;
    averageArea: number;
    distinctTypesCount: number;
    hasBedPreferenceMatch: boolean;
  }[] = [];

  // TRƯỜNG HỢP 1 PHÒNG: Mỗi loại phòng có maxOccupancy >= adults là 1 plan (children không tính)
  if (rooms === 1) {
    for (const rt of validTypes) {
      if (rt.maxOccupancy >= adults) {
        const guestAllocation = distributeGuests(adults, criteria.children, 1);
        const totalPrice = (Math.round(rt.basePrice * factor) + (rt.featurePricePerNight || 0)) * nights;
        const bedText = (rt.bedConfig || '').toLowerCase();
        const prefersDouble = criteria.children > 0 || adults % 2 === 0;
        const isDouble = bedText.includes('đôi') || bedText.includes('queen') || bedText.includes('king') || bedText.includes('double');
        const hasBedMatch = prefersDouble ? isDouble : !isDouble;

        rawPlans.push({
          items: [
            {
              roomTypeId: rt.roomTypeId,
              roomIds: rt.roomIds?.slice(0, 1),
              features: rt.features,
              featurePricePerNight: rt.featurePricePerNight,
              name: rt.name,
              quantity: 1,
              basePrice: rt.basePrice,
              maxOccupancy: rt.maxOccupancy,
              availableCount: rt.availableCount,
              area: rt.area,
              bedConfig: rt.bedConfig,
              image: rt.image,
              guests: guestAllocation,
            },
          ],
          totalRooms: 1,
          totalCapacity: rt.maxOccupancy,
          totalPrice,
          averageArea: rt.area || 28,
          distinctTypesCount: 1,
          hasBedPreferenceMatch: hasBedMatch,
        });

        if (rawPlans.length >= config.maxPlans) break;
      }
    }
    return rawPlans;
  }

  // TRƯỜNG HỢP N PHÒNG: Duyệt tổ hợp loại phòng (cho phép lặp)
  // Điều kiện:
  // 1. Tổng số phòng = rooms
  // 2. Σ(maxOccupancy * quantity) >= adults
  // 3. quantity <= availableCount cho từng loại phòng
  // 4. Cắt sớm ở config.maxPlans
  function findCombinations(
    typeIndex: number,
    currentRooms: number,
    currentPlan: { type: AvailableRoomType; qty: number }[]
  ) {
    if (rawPlans.length >= config.maxPlans) return;

    if (currentRooms === rooms) {
      // Kiểm tra tổng sức chứa
      const totalCapacity = currentPlan.reduce((sum, item) => sum + item.type.maxOccupancy * item.qty, 0);
      if (totalCapacity < adults) return;

      // Phân bổ khách vào từng phòng
      const allGuestSlots = distributeGuests(adults, criteria.children, rooms);
      let slotIdx = 0;

      let totalPrice = 0;
      let totalArea = 0;
      let totalRoomsCount = 0;
      let bedMatches = 0;

      const planItems: RoomPlanItem[] = [];

      for (const item of currentPlan) {
        const itemSlots = allGuestSlots.slice(slotIdx, slotIdx + item.qty);
        slotIdx += item.qty;

        totalPrice += (Math.round(item.type.basePrice * factor) + (item.type.featurePricePerNight || 0)) * nights * item.qty;
        totalArea += (item.type.area || 28) * item.qty;
        totalRoomsCount += item.qty;

        const bedText = (item.type.bedConfig || '').toLowerCase();
        const prefersDouble = criteria.children > 0 || adults % 2 === 0;
        const isDouble = bedText.includes('đôi') || bedText.includes('queen') || bedText.includes('king') || bedText.includes('double');
        if (prefersDouble ? isDouble : !isDouble) {
          bedMatches += item.qty;
        }

        planItems.push({
          roomTypeId: item.type.roomTypeId,
          roomIds: item.type.roomIds?.slice(0, item.qty),
          features: item.type.features,
          featurePricePerNight: item.type.featurePricePerNight,
          name: item.type.name,
          quantity: item.qty,
          basePrice: item.type.basePrice,
          maxOccupancy: item.type.maxOccupancy,
          availableCount: item.type.availableCount,
          area: item.type.area,
          bedConfig: item.type.bedConfig,
          image: item.type.image,
          guests: itemSlots,
        });
      }

      rawPlans.push({
        items: planItems,
        totalRooms: totalRoomsCount,
        totalCapacity,
        totalPrice,
        averageArea: Math.round(totalArea / totalRoomsCount),
        distinctTypesCount: currentPlan.length,
        hasBedPreferenceMatch: bedMatches >= Math.ceil(totalRoomsCount / 2),
      });
      return;
    }

    if (typeIndex >= validTypes.length) return;

    const rt = validTypes[typeIndex];
    const maxQtyForType = Math.min(rooms - currentRooms, rt.availableCount);

    for (let qty = maxQtyForType; qty >= 0; qty--) {
      if (qty > 0) {
        currentPlan.push({ type: rt, qty });
      }
      findCombinations(typeIndex + 1, currentRooms + qty, currentPlan);
      if (qty > 0) {
        currentPlan.pop();
      }
    }
  }

  findCombinations(0, 0, []);
  return rawPlans;
}

/**
 * Chấm điểm kế hoạch phòng (0 - 100 điểm)
 * Trọng số mặc định: fit (35), price (35), bed (15), split (15)
 */
export function scorePlans(
  plans: ReturnType<typeof buildPlans>,
  criteria: SearchCriteria,
  config = DEFAULT_SCORING_CONFIG
): {
  plan: (typeof plans)[0];
  score: number;
  fitScore: number;
  priceScore: number;
  bedScore: number;
  splitScore: number;
}[] {
  if (!plans || plans.length === 0) return [];

  const { fit: wFit, price: wPrice, bed: wBed, split: wSplit } = config.weights;

  // Tính minPrice & maxPrice để chuẩn hóa
  const prices = plans.map((p) => p.totalPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return plans.map((plan) => {
    // 1. FIT (35 điểm): 1 - (sức chứa dư / tổng sức chứa); dư 0-1 người tối ưu
    const surplus = plan.totalCapacity - criteria.adults;
    let fitScore = 0;
    if (surplus === 0 || surplus === 1) {
      fitScore = wFit; // Tối ưu hoàn hảo
    } else if (surplus > 1 && plan.totalCapacity > 0) {
      const penaltyRatio = surplus / plan.totalCapacity;
      fitScore = Math.max(0, wFit * (1 - penaltyRatio));
    }

    // 2. PRICE (35 điểm): Min-Max chuẩn hóa, rẻ -> cao điểm (1 plan full điểm)
    let priceScore = wPrice;
    if (maxPrice > minPrice) {
      const ratio = (plan.totalPrice - minPrice) / (maxPrice - minPrice);
      priceScore = Math.max(0, wPrice * (1 - ratio));
    }

    // 3. BED (15 điểm): Có trẻ em hoặc chẵn người lớn -> ưu tiên giường đôi; lẻ -> giường đơn
    const bedScore = plan.hasBedPreferenceMatch ? wBed : Math.round(wBed * 0.4);

    // 4. SPLIT (15 điểm): Phạt khi chia nhiều loại phòng khác nhau trong cùng 1 đơn
    let splitScore = wSplit;
    if (plan.distinctTypesCount > 1) {
      splitScore = Math.max(0, Math.round(wSplit / plan.distinctTypesCount));
    }

    const totalScore = Math.round((fitScore + priceScore + bedScore + splitScore) * 10) / 10;

    return {
      plan,
      score: totalScore,
      fitScore,
      priceScore,
      bedScore,
      splitScore,
    };
  });
}

/**
 * Sinh danh sách lý do thuyết phục từ DỮ KIỆN THỰC TẾ, không bịa
 */
export function buildReasons(
  plan: ReturnType<typeof buildPlans>[0],
  criteria: SearchCriteria,
  stats: { avgPrice: number; minPrice: number }
): string[] {
  const reasons: string[] = [];
  const surplus = plan.totalCapacity - criteria.adults;

  // 1. Khớp sức chứa
  if (surplus === 0) {
    reasons.push(`Vừa vặn tối ưu cho đoàn ${criteria.adults} khách`);
  } else if (surplus === 1) {
    reasons.push(`Dư 1 chỗ rộng rãi cho ${criteria.adults} khách`);
  } else if (surplus <= 3) {
    reasons.push(`Sức chứa tối đa ${plan.totalCapacity} khách thoải mái`);
  }

  // 2. Tiết kiệm giá
  if (stats.avgPrice > 0 && plan.totalPrice < stats.avgPrice) {
    const pct = Math.round(((stats.avgPrice - plan.totalPrice) / stats.avgPrice) * 100);
    if (pct >= 5) {
      reasons.push(`Tiết kiệm ${pct}% so với giá trung bình các phòng`);
    }
  } else if (plan.totalPrice === stats.minPrice) {
    reasons.push('Lựa chọn tiết kiệm chi phí nhất');
  }

  // 3. Khan hiếm (CHỈ sinh lý do khi availableCount <= 2, không tính vào điểm)
  const scarceItems = plan.items.filter((it) => it.availableCount <= 2);
  if (scarceItems.length > 0) {
    const minCount = Math.min(...scarceItems.map((it) => it.availableCount));
    reasons.push(`Chỉ còn ${minCount} phòng loại này`);
  }

  // 4. Tiện ích / Không gian
  if (plan.averageArea && plan.averageArea >= 35) {
    reasons.push(`Không gian rộng rãi ${plan.averageArea}m²`);
  }

  // 5. Đồng bộ loại phòng
  if (plan.distinctTypesCount === 1 && plan.totalRooms > 1) {
    reasons.push(`${plan.totalRooms} phòng cùng một hạng giúp ở gần nhau`);
  }

  // Đảm bảo có ít nhất 1-2 lý do thật
  if (reasons.length === 0) {
    reasons.push('Phù hợp tiêu chí tìm kiếm của bạn');
  }

  return reasons.slice(0, 3);
}

/**
 * Hàm đề xuất chính (recommend)
 * Trả về tối đa top 3 recommendations với nhãn:
 * - best_match: điểm cao nhất
 * - cheapest: tổng tiền thấp nhất (khác best_match)
 * - most_comfortable: sức chứa dư / diện tích lớn nhất (khác 2 cái trên)
 */
export function recommend(
  criteria: SearchCriteria,
  availableRoomTypes: AvailableRoomType[],
  config = DEFAULT_SCORING_CONFIG
): Recommendation[] {
  const plans = buildPlans(criteria, availableRoomTypes, config);
  if (plans.length === 0) {
    return [];
  }

  const scored = scorePlans(plans, criteria, config);
  // Sắp xếp theo score giảm dần
  scored.sort((a, b) => b.score - a.score);

  const prices = plans.map((p) => p.totalPrice);
  const minPrice = Math.min(...prices);
  const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const stats = { minPrice, avgPrice };

  const results: Recommendation[] = [];
  const usedPlanKeys = new Set<string>();

  function getPlanKey(p: typeof plans[0]): string {
    return p.items
      .map((it) => `${it.roomTypeId}x${it.quantity}`)
      .sort()
      .join('|');
  }

  // 1. BEST_MATCH: Điểm cao nhất
  const best = scored[0];
  const bestKey = getPlanKey(best.plan);
  usedPlanKeys.add(bestKey);

  results.push({
    id: `rec_best_${Date.now()}_0`,
    label: 'best_match',
    items: best.plan.items,
    totalRooms: best.plan.totalRooms,
    totalCapacity: best.plan.totalCapacity,
    totalPrice: best.plan.totalPrice,
    score: best.score,
    reasons: buildReasons(best.plan, criteria, stats),
  });

  // 2. CHEAPEST: Giá thấp nhất (khác best_match)
  const cheapestCandidate = [...scored].sort((a, b) => a.plan.totalPrice - b.plan.totalPrice);
  for (const c of cheapestCandidate) {
    const key = getPlanKey(c.plan);
    if (!usedPlanKeys.has(key)) {
      usedPlanKeys.add(key);
      results.push({
        id: `rec_cheap_${Date.now()}_1`,
        label: 'cheapest',
        items: c.plan.items,
        totalRooms: c.plan.totalRooms,
        totalCapacity: c.plan.totalCapacity,
        totalPrice: c.plan.totalPrice,
        score: c.score,
        reasons: buildReasons(c.plan, criteria, stats),
      });
      break;
    }
  }

  // 3. MOST_COMFORTABLE: Diện tích / sức chứa dư cao nhất (khác các plan trước)
  const comfortableCandidate = [...scored].sort((a, b) => {
    const surplusA = a.plan.totalCapacity - criteria.adults;
    const surplusB = b.plan.totalCapacity - criteria.adults;
    if (surplusB !== surplusA) return surplusB - surplusA;
    return b.plan.averageArea - a.plan.averageArea;
  });

  for (const c of comfortableCandidate) {
    const key = getPlanKey(c.plan);
    if (!usedPlanKeys.has(key)) {
      usedPlanKeys.add(key);
      results.push({
        id: `rec_comf_${Date.now()}_2`,
        label: 'most_comfortable',
        items: c.plan.items,
        totalRooms: c.plan.totalRooms,
        totalCapacity: c.plan.totalCapacity,
        totalPrice: c.plan.totalPrice,
        score: c.score,
        reasons: buildReasons(c.plan, criteria, stats),
      });
      break;
    }
  }

  // Nếu vẫn chưa đủ top 3 và còn kế hoạch khác
  for (const s of scored) {
    if (results.length >= config.topN) break;
    const key = getPlanKey(s.plan);
    if (!usedPlanKeys.has(key)) {
      usedPlanKeys.add(key);
      results.push({
        id: `rec_alt_${Date.now()}_${results.length}`,
        label: 'best_match',
        items: s.plan.items,
        totalRooms: s.plan.totalRooms,
        totalCapacity: s.plan.totalCapacity,
        totalPrice: s.plan.totalPrice,
        score: s.score,
        reasons: buildReasons(s.plan, criteria, stats),
      });
    }
  }

  return results.slice(0, config.topN);
}

export interface FallbackCandidate {
  criteria: SearchCriteria;
  field: 'apartment' | 'date' | 'stayType' | 'rooms';
  note: string;
}

/**
 * Sinh danh sách các tiêu chí nới lỏng (relaxed criteria) để fallback theo thứ tự:
 * 1. cùng ngày, chi nhánh khác
 * 2. cùng chi nhánh, lệch ±1-2 ngày
 * 3. đổi stay_type
 * 4. tách nhiều phòng
 */
export function generateFallbackCandidates(
  criteria: SearchCriteria,
  otherApartments: { id: number; name: string }[] = []
): FallbackCandidate[] {
  const candidates: FallbackCandidate[] = [];

  // 1. Cùng ngày, chi nhánh khác
  for (const apt of otherApartments) {
    if (!criteria.apartmentId || apt.id !== criteria.apartmentId) {
      candidates.push({
        criteria: { ...criteria, apartmentId: apt.id },
        field: 'apartment',
        note: `Đổi sang cơ sở ${apt.name}`,
      });
    }
  }

  // 2. Cùng chi nhánh, lệch ±1-2 ngày
  const sDate = new Date(criteria.checkIn);
  const eDate = new Date(criteria.checkOut);
  const diffTime = Math.max(86400000, eDate.getTime() - sDate.getTime());

  const shifts = [+1, -1, +2, -2];
  for (const dayShift of shifts) {
    const newIn = new Date(sDate.getTime() + dayShift * 86400000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newIn.getTime() >= today.getTime()) {
      const newOut = new Date(newIn.getTime() + diffTime);
      const inStr = newIn.toISOString().split('T')[0];
      const outStr = newOut.toISOString().split('T')[0];
      const sign = dayShift > 0 ? `+${dayShift}` : `${dayShift}`;
      candidates.push({
        criteria: { ...criteria, checkIn: inStr, checkOut: outStr },
        field: 'date',
        note: `Đổi ngày (${sign} ngày: ${inStr} → ${outStr})`,
      });
    }
  }

  // 3. Đổi stay_type
  const allStayTypes = ['overnight', 'fullday', 'daytime'];
  for (const st of allStayTypes) {
    if (st !== criteria.stayType) {
      const label = STAY_TYPE_FACTORS[st]?.name || st;
      candidates.push({
        criteria: { ...criteria, stayType: st },
        field: 'stayType',
        note: `Đổi sang gói ${label}`,
      });
    }
  }

  // 4. Tách nhiều phòng (nếu rooms < adults)
  if (criteria.rooms < criteria.adults) {
    const extraRooms = Math.min(criteria.rooms + 1, criteria.adults);
    candidates.push({
      criteria: { ...criteria, rooms: extraRooms },
      field: 'rooms',
      note: `Tách thành ${extraRooms} phòng`,
    });
  }

  return candidates;
}

/**
 * recommendWithFallback: Tự động chạy fallback khi kế hoạch ban đầu rỗng
 */
export async function recommendWithFallback(
  criteria: SearchCriteria,
  roomTypesProvider: (crit: SearchCriteria) => Promise<AvailableRoomType[]> | AvailableRoomType[],
  otherApartments: { id: number; name: string }[] = [],
  config = DEFAULT_SCORING_CONFIG
): Promise<Recommendation[]> {
  const currentRooms = await roomTypesProvider(criteria);
  const initialRecs = recommend(criteria, currentRooms, config);
  if (initialRecs.length > 0) {
    return initialRecs;
  }

  // Chạy các ứng viên fallback tuần tự, dừng khi tìm được kết quả đầu tiên
  const candidates = generateFallbackCandidates(criteria, otherApartments);
  for (const cand of candidates) {
    const candRooms = await roomTypesProvider(cand.criteria);
    const candRecs = recommend(cand.criteria, candRooms, config);
    if (candRecs.length > 0) {
      // Gán label 'alternative' và relaxed note
      return candRecs.map((rec) => ({
        ...rec,
        label: 'alternative' as const,
        relaxed: {
          field: cand.field,
          note: cand.note,
        },
      }));
    }
  }

  return [];
}
