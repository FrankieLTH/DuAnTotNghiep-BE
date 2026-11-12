/**
 * Runner test cho roomSuggestion
 */
const { suggestRoomTypes } = require('./roomSuggestion.ts');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('--- STARTING UNIT TESTS FOR suggestRoomTypes ---');

// Kịch bản 1: 4 khách, 1 phòng
{
  const types = [
    { id: 1, name: 'Phòng 6 người', maxGuests: 6, price: 1500000, availableCount: 2 },
    { id: 2, name: 'Phòng 4 người', maxGuests: 4, price: 1200000, availableCount: 2 },
    { id: 3, name: 'Phòng 2 người', maxGuests: 2, price: 800000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, { adults: 4, children: 0, roomsWanted: 1 });

  assert(results[0].room.id === 2, 'Kịch bản 1: Phòng 4 người phải đứng đầu danh sách');
  assert(results[0].isBestFit === true, 'Kịch bản 1: Phòng 4 người phải là isBestFit');
  assert(results[0].suggestedQty === 1, 'Kịch bản 1: suggestedQty của phòng 4 người phải là 1');
  assert(results[0].waste === 0, 'Kịch bản 1: waste của phòng 4 người phải là 0');

  const room6 = results.find((r) => r.room.id === 1);
  assert(room6.suggestedQty === 0, 'Kịch bản 1: Phòng 6 người phải có suggestedQty = 0');
  assert(room6.fitStatus === 'ok', 'Kịch bản 1: Phòng 6 người phải có fitStatus ok');

  const room2 = results.find((r) => r.room.id === 3);
  assert(room2.fitStatus === 'not_enough_capacity', 'Kịch bản 1: Phòng 2 người phải là not_enough_capacity');

  console.log('✓ Kịch bản 1 (a): 4 khách, 1 phòng PASSED');
}

// Kịch bản 2: 4 khách, 2 phòng (rồi đổi so sánh)
{
  const types = [
    { id: 1, name: 'Studio 1 người', maxGuests: 1, price: 500000, availableCount: 3 },
    { id: 2, name: 'Phòng đôi 2 người', maxGuests: 2, price: 800000, availableCount: 3 },
    { id: 3, name: 'Phòng gia đình chỉ còn 1 phòng trống', maxGuests: 4, price: 1400000, availableCount: 1 },
  ];

  const results = suggestRoomTypes(types, { adults: 4, children: 0, roomsWanted: 2 });

  assert(results[0].room.id === 2, 'Kịch bản 2: Phòng đôi 2 người phải đứng đầu');
  assert(results[0].isBestFit === true, 'Kịch bản 2: Phòng đôi phải là isBestFit');
  assert(results[0].suggestedQty === 2, 'Kịch bản 2: suggestedQty phải là 2');

  const room1 = results.find((r) => r.room.id === 1);
  assert(room1.fitStatus === 'not_enough_capacity', 'Kịch bản 2: Studio 1 người phải là not_enough_capacity');

  const roomSoldOut = results.find((r) => r.room.id === 3);
  assert(roomSoldOut.fitStatus === 'sold_out', 'Kịch bản 2: Phòng có availableCount < 2 phải là sold_out');
  assert(results[results.length - 1].room.id === 3, 'Kịch bản 2: sold_out phải đứng cuối cùng');

  console.log('✓ Kịch bản 2 (b): 4 khách, 2 phòng (đổi/so sánh) PASSED');
}

// Kịch bản 3: 6 khách, 1 phòng khi không có loại nào đủ sức chứa
{
  const types = [
    { id: 1, name: 'Phòng 2 người', maxGuests: 2, price: 800000, availableCount: 2 },
    { id: 2, name: 'Phòng 3 người', maxGuests: 3, price: 1000000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, { adults: 6, children: 0, roomsWanted: 1 });

  assert(results.every((r) => r.isBestFit === false), 'Kịch bản 3: Không có loại nào isBestFit');
  assert(results.every((r) => r.suggestedQty === 0), 'Kịch bản 3: Tất cả suggestedQty = 0');
  assert(results[0].room.id === 2, 'Kịch bản 3: Phòng 3 người phải xếp trước phòng 2 người');

  console.log('✓ Kịch bản 3 (c): 6 khách khi không loại nào đủ sức chứa 1 phòng PASSED');
}

// Kịch bản 4: Hòa waste -> chọn loại rẻ hơn
{
  const types = [
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
  const types = [
    { id: 1, name: 'Phòng đôi', maxGuests: 2, price: 800000, availableCount: 5 },
  ];

  const results = suggestRoomTypes(types, { adults: 2, children: 0, roomsWanted: 5 });

  assert(results[0].effectiveRooms === 2, 'Kịch bản 5: n phải bị cắt về 2');
  assert(results[0].suggestedQty === 2, 'Kịch bản 5: suggestedQty là 2');

  console.log('✓ Kịch bản 5: Cắt roomsWanted vượt tổng khách PASSED');
}

// Kịch bản 6: 2 người lớn, 1 trẻ em 8 tuổi -> đề xuất phòng sức chứa 2 người (waste 0) thay vì phòng 4-6 người
{
  const types = [
    { id: 1, name: 'Phòng gia đình 4-6 người', maxGuests: 6, price: 1500000, availableCount: 2 },
    { id: 2, name: 'Phòng đôi 2 người', maxGuests: 2, price: 800000, availableCount: 2 },
  ];

  const results = suggestRoomTypes(types, {
    adults: 2,
    children: 1,
    childrenAges: [8],
    roomsWanted: 1,
  });

  assert(results[0].room.id === 2, 'Kịch bản 6: Phòng đôi 2 người phải đứng đầu danh sách');
  assert(results[0].isBestFit === true, 'Kịch bản 6: Phòng đôi 2 người phải là isBestFit');
  assert(results[0].suggestedQty === 1, 'Kịch bản 6: suggestedQty phải là 1');
  assert(results[0].waste === 0, 'Kịch bản 6: waste phải là 0 vì trẻ 8 tuổi được miễn tính sức chứa');

  console.log('✓ Kịch bản 6: 2 người lớn + 1 trẻ 8 tuổi đề xuất phòng đôi 2 người (waste 0) PASSED');
}

console.log('--- STARTING UNIT TESTS FOR roomNumbering ---');
const {
  getNextFloorRoomDigits,
  generateFloorRoomsBatch,
  findNextStartDigitsForPrefix,
  sortRoomsNatural,
} = require('./roomNumbering.ts');

// Kịch bản 7: Bước nhảy số phòng theo tầng (10 phòng/tầng)
{
  assert(getNextFloorRoomDigits('001') === '002', '001 -> 002');
  assert(getNextFloorRoomDigits('009') === '010', '009 -> 010');
  assert(getNextFloorRoomDigits('010') === '101', '010 -> 101 (nhảy tầng 1)');
  assert(getNextFloorRoomDigits('109') === '110', '109 -> 110');
  assert(getNextFloorRoomDigits('110') === '201', '110 -> 201 (nhảy tầng 2)');
  console.log('✓ Kịch bản 7: Nhảy tầng sau phòng thứ 10 (*10 -> *01) PASSED');
}

// Kịch bản 8: Bỏ qua số 4 và số 13
{
  assert(getNextFloorRoomDigits('003') === '005', '003 -> 005 (bỏ qua 004)');
  assert(getNextFloorRoomDigits('103') === '105', '103 -> 105 (bỏ qua 104)');
  assert(getNextFloorRoomDigits('310') === '501', '310 -> 501 (bỏ qua toàn bộ tầng 4 chứa số 4)');
  console.log('✓ Kịch bản 8: Tự động bỏ qua số chứa 4 và số 13 PASSED');
}

// Kịch bản 9: Sinh danh sách phòng dải liên tục theo tầng
{
  const rooms = generateFloorRoomsBatch('P', '001', 10, true, true, ['P101']);
  const roomNumbers = rooms.map(r => r.room_number);
  // Kỳ vọng 10 phòng: 001, 002, 003, 005, 006, 007, 008, 009, 010, 101
  assert(roomNumbers.length === 10, 'Sinh đủ 10 phòng');
  assert(roomNumbers[0] === 'P001', 'Phòng đầu tiên P001');
  assert(roomNumbers[3] === 'P005', 'Phòng thứ 4 là P005 (bỏ qua P004)');
  assert(roomNumbers[8] === 'P010', 'Phòng thứ 9 là P010');
  assert(roomNumbers[9] === 'P101', 'Phòng thứ 10 là P101 (nhảy tầng)');
  assert(rooms[9].isDuplicate === true, 'P101 đã có trong chi nhánh phải bị đánh dấu isDuplicate = true');
  console.log('✓ Kịch bản 9: Sinh dải số theo tầng & phát hiện trùng lặp PASSED');
}

// Kịch bản 10: Tự động tìm số phòng tiếp theo dựa trên phòng mới nhất
{
  const existing = ['P101', 'P102', 'P110', 'A201'];
  const resP = findNextStartDigitsForPrefix(existing, 'P');
  assert(resP.latestRoom === 'P110', 'Phòng lớn nhất của tiền tố P là P110');
  assert(resP.nextDigits === '201', 'Số tiếp theo sau P110 là 201');

  const resA = findNextStartDigitsForPrefix(existing, 'A');
  assert(resA.latestRoom === 'A201', 'Phòng lớn nhất của tiền tố A là A201');
  assert(resA.nextDigits === '202', 'Số tiếp theo sau A201 là 202');

  const resB = findNextStartDigitsForPrefix(existing, 'B');
  assert(resB.latestRoom === null, 'Tiền tố B chưa có phòng nào');
  assert(resB.nextDigits === '001', 'Tiền tố mới mặc định bắt đầu từ 001');
  console.log('✓ Kịch bản 10: Tự động nhận diện phòng mới nhất và gợi ý số tiếp theo (+1) PASSED');
}

// Kịch bản 11: Sắp xếp tự nhiên theo tầng
{
  const unsorted = [{ room_number: 'P201' }, { room_number: 'A101' }, { room_number: 'P002' }, { room_number: 'P010' }, { room_number: 'P101' }];
  const sorted = sortRoomsNatural(unsorted).map(r => r.room_number);
  assert(sorted[0] === 'A101', 'A101 đứng đầu vì prefix A');
  assert(sorted[1] === 'P002', 'P002 tầng 0');
  assert(sorted[2] === 'P010', 'P010 tầng 0');
  assert(sorted[3] === 'P101', 'P101 tầng 1');
  assert(sorted[4] === 'P201', 'P201 tầng 2');
  console.log('✓ Kịch bản 11: Sắp xếp danh sách phòng tự nhiên theo tầng PASSED');
}

console.log('--- STARTING UNIT TESTS FOR baskets ---');
const { buildBaskets, fallbackBaskets } = require('./baskets.ts');

// Kịch bản 12: 4 người lớn + 1 trẻ em, đặt 2 phòng
{
  const types = [
    { roomTypeId: 1, apartmentId: 1, name: 'Studio Cozy', maxOccupancy: 2, basePrice: 500000, availableCount: 3, area: 28, bedConfig: '1 giường King' },
    { roomTypeId: 2, apartmentId: 1, name: 'Superior Balcony', maxOccupancy: 3, basePrice: 700000, availableCount: 2, area: 34, bedConfig: '1 Queen + 1 sofa' },
    { roomTypeId: 3, apartmentId: 1, name: 'Penthouse 6 người', maxOccupancy: 6, basePrice: 2000000, availableCount: 1, area: 80, bedConfig: '3 King' },
  ];

  const baskets = buildBaskets({
    checkIn: '2026-11-15',
    checkOut: '2026-11-17',
    stayType: 'fullday',
    adults: 4,
    children: 1,
    rooms: 2,
  }, types);

  assert(baskets.length > 0, 'Phải sinh được ít nhất 1 giỏ');
  for (const b of baskets) {
    assert(b.totalRooms === 2, 'Mỗi giỏ phải gồm đúng 2 phòng');
    assert(b.spare >= 0 && b.spare <= 3, 'Spare phải nằm trong khoảng 0 đến 3');
    assert(b.totalCapacity >= 4, 'Tổng sức chứa phải đủ 4 người lớn');
  }
  console.log('✓ Kịch bản 12: 4 người lớn + 1 trẻ em đặt 2 phòng thỏa mãn 0 <= spare <= 3 PASSED');
}

// Kịch bản 13: Gắn thẻ exact_fit khi spare = 0 và cheapest cho giỏ rẻ nhất
{
  const types = [
    { roomTypeId: 1, apartmentId: 1, name: 'Studio Cozy', maxOccupancy: 2, basePrice: 500000, availableCount: 4, area: 28 },
    { roomTypeId: 2, apartmentId: 1, name: 'Superior Balcony', maxOccupancy: 3, basePrice: 700000, availableCount: 2, area: 34 },
  ];

  const baskets = buildBaskets({
    checkIn: '2026-11-15',
    checkOut: '2026-11-17',
    stayType: 'fullday',
    adults: 4,
    children: 0,
    rooms: 2,
  }, types);

  // Giỏ Studio x2: sức chứa 4, spare = 0 -> exact_fit & cheapest
  const exactFit = baskets.find(b => b.spare === 0);
  assert(exactFit, 'Phải có giỏ exact_fit với spare = 0');
  assert(exactFit.tags.includes('exact_fit'), 'Phải được gắn tag exact_fit');
  assert(exactFit.tags.includes('cheapest'), 'Phải được gắn tag cheapest');
  console.log('✓ Kịch bản 13: Gắn thẻ exact_fit và cheapest chuẩn xác PASSED');
}

// Kịch bản 14: Mỗi phòng trong giỏ ghi rõ số lượng và phân bổ ít nhất 1 người lớn
{
  const types = [
    { roomTypeId: 1, apartmentId: 1, name: 'Studio', maxOccupancy: 2, basePrice: 500000, availableCount: 2 },
    { roomTypeId: 2, apartmentId: 1, name: 'Superior', maxOccupancy: 3, basePrice: 700000, availableCount: 2 },
  ];

  const baskets = buildBaskets({
    checkIn: '2026-11-15',
    checkOut: '2026-11-17',
    stayType: 'fullday',
    adults: 3,
    children: 1,
    rooms: 2,
  }, types);

  const b = baskets[0];
  assert(b.totalRooms === 2, 'Tổng số phòng phải bằng 2');
  const totalItemQty = b.items.reduce((s, it) => s + it.quantity, 0);
  assert(totalItemQty === 2, 'Tổng số lượng các items phải bằng 2 phòng');
  for (const it of b.items) {
    assert(it.quantity >= 1, 'Quantity phải từ 1 trở lên');
    for (const g of it.guests) {
      assert(g.adults >= 1, 'Mỗi phòng bắt buộc có ít nhất 1 người lớn >= 15 tuổi');
    }
  }
  console.log('✓ Kịch bản 14: Mỗi phòng ghi rõ số lượng và có ít nhất 1 người lớn PASSED');
}

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY! ---');
