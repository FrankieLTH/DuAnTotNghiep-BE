/**
 * project/shared/helpers/roomSuggestion.spec.ts
 * Unit test kiểm chứng cho helper suggestRoomTypes
 */

import { suggestRoomTypes } from './roomSuggestion';
import type { RoomTypeSuggestionInput } from './roomSuggestion';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('--- STARTING UNIT TESTS FOR suggestRoomTypes ---');

// Kịch bản 1: 4 khách, 1 phòng
{
  const types: RoomTypeSuggestionInput[] = [
    { id: 1, name: 'Phòng 6 người', maxGuests: 6, price: 1500000, availableCount: 2 },
    { id: 2, name: 'Phòng 4 người', maxGuests: 4, price: 1200000, availableCount: 2 },
    { id: 3, name: 'Phòng 2 người', maxGuests: 2, price: 800000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, { adults: 4, children: 0, roomsWanted: 1 });

  // 1. Loại đầu tiên phải là Phòng 4 người (waste 0, isBestFit)
  assert(results[0].room.id === 2, 'Kịch bản 1: Phòng 4 người phải đứng đầu danh sách');
  assert(results[0].isBestFit === true, 'Kịch bản 1: Phòng 4 người phải là isBestFit');
  assert(results[0].suggestedQty === 1, 'Kịch bản 1: suggestedQty của phòng 4 người phải là 1');
  assert(results[0].waste === 0, 'Kịch bản 1: waste của phòng 4 người phải là 0');

  // 2. Phòng 6 người có suggestedQty = 0
  const room6 = results.find((r) => r.room.id === 1)!;
  assert(room6.suggestedQty === 0, 'Kịch bản 1: Phòng 6 người phải có suggestedQty = 0');
  assert(room6.fitStatus === 'ok', 'Kịch bản 1: Phòng 6 người phải có fitStatus ok');

  // 3. Phòng 2 người phải là not_enough_capacity
  const room2 = results.find((r) => r.room.id === 3)!;
  assert(room2.fitStatus === 'not_enough_capacity', 'Kịch bản 1: Phòng 2 người phải là not_enough_capacity');

  console.log('✓ Kịch bản 1: 4 khách, 1 phòng PASSED');
}

// Kịch bản 2: 4 khách, 2 phòng
{
  const types: RoomTypeSuggestionInput[] = [
    { id: 1, name: 'Studio 1 người', maxGuests: 1, price: 500000, availableCount: 3 },
    { id: 2, name: 'Phòng đôi 2 người', maxGuests: 2, price: 800000, availableCount: 3 },
    { id: 3, name: 'Phòng gia đình chỉ còn 1 phòng trống', maxGuests: 4, price: 1400000, availableCount: 1 },
  ];

  const results = suggestRoomTypes(types, { adults: 4, children: 0, roomsWanted: 2 });

  // Phòng đôi 2 người: waste = 2*2 - 4 = 0, availableCount = 3 >= 2 -> ok & best fit
  assert(results[0].room.id === 2, 'Kịch bản 2: Phòng đôi 2 người phải đứng đầu');
  assert(results[0].isBestFit === true, 'Kịch bản 2: Phòng đôi phải là isBestFit');
  assert(results[0].suggestedQty === 2, 'Kịch bản 2: suggestedQty phải là 2');

  // Studio 1 người: waste = 1*2 - 4 = -2 -> not_enough_capacity
  const room1 = results.find((r) => r.room.id === 1)!;
  assert(room1.fitStatus === 'not_enough_capacity', 'Kịch bản 2: Studio 1 người phải là not_enough_capacity');

  // Phòng gia đình: availableCount = 1 < 2 -> sold_out
  const roomSoldOut = results.find((r) => r.room.id === 3)!;
  assert(roomSoldOut.fitStatus === 'sold_out', 'Kịch bản 2: Phòng có availableCount < 2 phải là sold_out');
  assert(results[results.length - 1].room.id === 3, 'Kịch bản 2: sold_out phải đứng cuối cùng');

  console.log('✓ Kịch bản 2: 4 khách, 2 phòng (đổi/so sánh các loại) PASSED');
}

// Kịch bản 3: 6 khách, 1 phòng khi không có loại nào đủ sức chứa
{
  const types: RoomTypeSuggestionInput[] = [
    { id: 1, name: 'Phòng 2 người', maxGuests: 2, price: 800000, availableCount: 2 },
    { id: 2, name: 'Phòng 3 người', maxGuests: 3, price: 1000000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, { adults: 6, children: 0, roomsWanted: 1 });

  // Không có loại nào isBestFit
  assert(results.every((r) => r.isBestFit === false), 'Kịch bản 3: Không có loại nào isBestFit');
  assert(results.every((r) => r.suggestedQty === 0), 'Kịch bản 3: Tất cả suggestedQty = 0');
  // Phòng 3 người ít thiếu hơn (waste -3) phải đứng trước phòng 2 người (waste -4)
  assert(results[0].room.id === 2, 'Kịch bản 3: Phòng 3 người phải xếp trước phòng 2 người');

  console.log('✓ Kịch bản 3: 6 khách khi không loại nào đủ sức chứa 1 phòng PASSED');
}

// Kịch bản 4: Hòa waste -> chọn loại rẻ hơn
{
  const types: RoomTypeSuggestionInput[] = [
    { id: 1, name: 'Phòng đắt hơn', maxGuests: 4, price: 1500000, availableCount: 2 },
    { id: 2, name: 'Phòng rẻ hơn', maxGuests: 4, price: 1100000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, { adults: 4, children: 0, roomsWanted: 1 });

  assert(results[0].room.id === 2, 'Kịch bản 4: Khi hòa waste, phòng rẻ hơn phải thắng');
  assert(results[0].isBestFit === true, 'Kịch bản 4: Phòng rẻ hơn là isBestFit');

  console.log('✓ Kịch bản 4: Hòa waste chọn giá rẻ hơn PASSED');
}

// Kịch bản 5: Biên n > tổng khách -> tự cắt về tổng khách
{
  const types: RoomTypeSuggestionInput[] = [
    { id: 1, name: 'Phòng đôi', maxGuests: 2, price: 800000, availableCount: 5 },
  ];

  // 2 khách nhưng đòi 5 phòng -> n phải bị cắt về 2
  const results = suggestRoomTypes(types, { adults: 2, children: 0, roomsWanted: 5 });

  assert(results[0].effectiveRooms === 2, 'Kịch bản 5: n phải bị cắt về 2');
  assert(results[0].suggestedQty === 2, 'Kịch bản 5: suggestedQty là 2');

  console.log('✓ Kịch bản 5: Cắt roomsWanted vượt tổng khách PASSED');
}

console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
