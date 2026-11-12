/**
 * project/shared/helpers/roomSuggestion.ts
 * Helper tính toán và gợi ý loại phòng tối ưu theo bộ lọc tìm kiếm
 * Đồi Bông Gòn Homestay
 */

export type FitStatus = 'ok' | 'not_enough_capacity' | 'sold_out';

export interface RoomTypeSuggestionInput {
  id: number;
  name: string;
  maxGuests: number;
  price: number;
  availableCount: number;
  [key: string]: any;
}

export interface SuggestionCriteria {
  adults: number;
  children: number;
  roomsWanted: number;
  childrenAges?: number[];
  countableGuests?: number;
}

export interface SuggestedRoomType<T extends RoomTypeSuggestionInput = RoomTypeSuggestionInput> {
  room: T;
  suggestedQty: number; // n cho loại phù hợp nhất, 0 cho các loại khác
  isBestFit: boolean;
  fitStatus: FitStatus;
  waste: number;        // maxGuests * n - capacityGuests
  effectiveRooms: number; // n
  totalGuests: number;
  capacityGuests: number;
}

/**
 * Hàm thuần gợi ý và sắp xếp danh sách loại phòng theo yêu cầu
 * Trả về TẤT CẢ loại phòng (không ẩn bất kỳ loại nào)
 */
export function suggestRoomTypes<T extends RoomTypeSuggestionInput>(
  types: T[],
  criteria: SuggestionCriteria
): SuggestedRoomType<T>[] {
  if (!types || types.length === 0) {
    return [];
  }

  // 1. Tính tổng người & số phòng hiệu lực n:
  // n = min(max(1, roomsWanted), tổng người)
  const totalPeople = Math.max(1, (criteria.adults || 1) + (criteria.children || 0));
  const rawRoomsWanted = criteria.roomsWanted !== undefined && criteria.roomsWanted !== null
    ? criteria.roomsWanted
    : 1;
  const n = Math.min(Math.max(1, rawRoomsWanted), totalPeople);

  // 2. Tính số khách thực tế tính vào sức chứa phòng:
  // Quy tắc Đồi Bông Gòn: Trẻ em <= 15 tuổi miễn tính sức chứa phòng.
  // Chỉ tính người lớn (>= 15 tuổi) và trẻ em > 15 tuổi.
  let capacityGuests = criteria.adults || 1;
  if (typeof criteria.countableGuests === 'number') {
    capacityGuests = criteria.countableGuests;
  } else if (criteria.childrenAges && criteria.childrenAges.length > 0) {
    const olderChildren = criteria.childrenAges.filter((age) => age > 15).length;
    capacityGuests = (criteria.adults || 1) + olderChildren;
  }
  capacityGuests = Math.max(1, capacityGuests);

  // 3. Đánh giá từng loại phòng
  interface EvaluatedItem {
    room: T;
    originalIndex: number;
    waste: number;
    fitStatus: FitStatus;
    isBestFit: boolean;
    suggestedQty: number;
  }

  const evaluated: EvaluatedItem[] = types.map((room, idx) => {
    const maxGuests = room.maxGuests || 2;
    const availableCount = room.availableCount !== undefined && room.availableCount !== null
      ? room.availableCount
      : 0;

    // waste tính theo số khách thực tế cần xếp chỗ (trẻ <= 15t được miễn)
    const waste = maxGuests * n - capacityGuests;

    let fitStatus: FitStatus = 'ok';
    if (availableCount < n) {
      fitStatus = 'sold_out';
    } else if (waste < 0) {
      fitStatus = 'not_enough_capacity';
    } else {
      fitStatus = 'ok';
    }

    return {
      room,
      originalIndex: idx,
      waste,
      fitStatus,
      isBestFit: false,
      suggestedQty: 0,
    };
  });

  // 3. Tìm phòng phù hợp nhất:
  // Loại có fitStatus 'ok' với waste nhỏ nhất. Nếu hòa thì chọn loại giá rẻ hơn.
  const okCandidates = evaluated.filter((item) => item.fitStatus === 'ok');

  if (okCandidates.length > 0) {
    let best = okCandidates[0];
    for (let i = 1; i < okCandidates.length; i++) {
      const curr = okCandidates[i];
      if (curr.waste < best.waste) {
        best = curr;
      } else if (curr.waste === best.waste) {
        if (curr.room.price < best.room.price) {
          best = curr;
        } else if (curr.room.price === best.room.price) {
          if (curr.originalIndex < best.originalIndex) {
            best = curr;
          }
        }
      }
    }

    // Chỉ loại phù hợp nhất có suggestedQty = n, isBestFit = true
    best.isBestFit = true;
    best.suggestedQty = n;
  }

  // 4. Sắp xếp danh sách:
  // - Loại phù hợp nhất lên đầu
  // - Các loại 'ok' còn lại: waste tăng dần, rồi giá tăng dần
  // - Các loại 'not_enough_capacity': waste giảm dần (ít thiếu nhất trước), rồi giá tăng dần
  // - 'sold_out' ở cuối cùng
  evaluated.sort((a, b) => {
    if (a.isBestFit) return -1;
    if (b.isBestFit) return 1;

    // Thứ tự nhóm trạng thái: 'ok' (0) -> 'not_enough_capacity' (1) -> 'sold_out' (2)
    const statusOrder: Record<FitStatus, number> = {
      ok: 0,
      not_enough_capacity: 1,
      sold_out: 2,
    };

    if (statusOrder[a.fitStatus] !== statusOrder[b.fitStatus]) {
      return statusOrder[a.fitStatus] - statusOrder[b.fitStatus];
    }

    // Trong cùng nhóm 'ok': waste tăng dần, rồi giá tăng dần
    if (a.fitStatus === 'ok') {
      if (a.waste !== b.waste) return a.waste - b.waste;
      if (a.room.price !== b.room.price) return a.room.price - b.room.price;
      return a.originalIndex - b.originalIndex;
    }

    // Trong cùng nhóm 'not_enough_capacity': waste giảm dần (ít thiếu nhất lên trước), rồi giá tăng dần
    if (a.fitStatus === 'not_enough_capacity') {
      if (a.waste !== b.waste) return b.waste - a.waste;
      if (a.room.price !== b.room.price) return a.room.price - b.room.price;
      return a.originalIndex - b.originalIndex;
    }

    // Trong cùng nhóm 'sold_out': giá tăng dần
    if (a.room.price !== b.room.price) return a.room.price - b.room.price;
    return a.originalIndex - b.originalIndex;
  });

  return evaluated.map((item) => ({
    room: item.room,
    suggestedQty: item.suggestedQty,
    isBestFit: item.isBestFit,
    fitStatus: item.fitStatus,
    waste: item.waste,
    effectiveRooms: n,
    totalGuests: totalPeople,
    capacityGuests,
  }));
}
