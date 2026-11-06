// ============================================================================
// IDEMPOTENT COMPREHENSIVE SEED DATA
// 3 Branches, 12 Room Types, 36 Rooms, Locks, 10 Customers, Staff, 25 Bookings
// ============================================================================

import {
  BookingStatus,
  BookingType,
  VerificationStatus,
  BookingSource,
  GuestType,
  DocType,
  GuestSlotStatus,
  ApartmentStatus,
  RoomStatus,
  TransactionType,
  LockStatus,
  LockType,
  StaffRole,
} from '@shared/enums';

export interface SeedPayload {
  branches: Array<{
    id: number;
    name: string;
    address: string;
    hotline: string;
    status: ApartmentStatus;
  }>;
  roomTypes: Array<{
    id: number;
    apartment_id: number;
    name: string;
    base_price: number;
    max_occupancy: number;
    description: string;
    bed_config: string;
    area: number;
    is_active: boolean;
  }>;
  rooms: Array<{
    room_id: number;
    apartment_id: number;
    room_type_id: number;
    room_number: string;
    status: RoomStatus;
    is_hidden: boolean;
  }>;
  locks: Array<{
    id: number;
    room_id: number;
    cloud_lock_id: string;
    lock_name: string;
    lock_type: LockType;
    lock_status: LockStatus;
    battery_level: number;
    master_pin: string;
  }>;
  roles: Array<{ role_id: number; role_name: StaffRole }>;
  staff: Array<{
    staff_id: number;
    role_id: number;
    apartment_id: number | null;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
  }>;
  customers: Array<{
    customer_id: number;
    full_name: string;
    email: string;
    phone: string;
    is_blocked: boolean;
    is_hidden: boolean;
  }>;
  bookings: Array<{
    id: number;
    booking_code: string;
    apartment_id: number;
    customer_id: number;
    voucher_id: number | null;
    adults: number;
    children: number;
    is_booked_for_other: boolean;
    lock_email: string | null;
    booking_type: BookingType;
    booked_start_time: string;
    booked_end_time: string;
    check_in_actual: string | null;
    check_out_actual: string | null;
    booking_status: BookingStatus;
    verification_status: VerificationStatus;
    reviewed_by: number | null;
    reviewed_at: string | null;
    consent_at: string | null;
    stay_reason: string | null;
    source: BookingSource;
    created_by: number | null;
    note: string | null;
    cancel_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: number | null;
    total_price: number;
    discount_amount: number;
    hold_expires_at: string | null;
    room_type_id: number;
    assigned_room_id: number | null;
    pin: string | null;
    guests: Array<{
      guest_type: GuestType;
      is_staying: boolean;
      full_name: string;
      date_of_birth: string | null;
      gender: string | null;
      phone: string | null;
      email: string | null;
      doc_type: DocType | null;
      doc_number: string | null;
      status: GuestSlotStatus;
      doc_deleted_at: string | null;
    }>;
    transactions: Array<{
      type: TransactionType;
      amount: number;
      payment_method: string;
      note?: string;
    }>;
  }>;
}

export function generateSeedData(): SeedPayload {
  const now = new Date();

  // 1. 3 Chi Nhánh
  const branches = [
    {
      id: 1,
      name: 'The Grand Ba Đình',
      address: '45 Liễu Giai, Ba Đình, Hà Nội',
      hotline: '02438889901',
      status: ApartmentStatus.ACTIVE,
    },
    {
      id: 2,
      name: 'Riverside Cầu Giấy',
      address: '12 Chùa Hà, Cầu Giấy, Hà Nội',
      hotline: '02438889902',
      status: ApartmentStatus.ACTIVE,
    },
    {
      id: 3,
      name: 'Old Quarter Hoàn Kiếm',
      address: '88 Hàng Trống, Hoàn Kiếm, Hà Nội',
      hotline: '02438889903',
      status: ApartmentStatus.ACTIVE,
    },
  ];

  // 2. 4 Loại phòng mỗi chi nhánh = 12 loại phòng
  const roomTypes: SeedPayload['roomTypes'] = [];
  const roomTypeTemplates = [
    { name: 'Studio Cozy', base_price: 600000, max_occupancy: 2, bed_config: '1 giường King', area: 26 },
    { name: '1-Bedroom Deluxe', base_price: 950000, max_occupancy: 3, bed_config: '1 giường King, 1 Sofa bed', area: 38 },
    { name: '2-Bedroom Suite', base_price: 1450000, max_occupancy: 4, bed_config: '2 giường Queen', area: 55 },
    { name: 'Penthouse Panoramic', base_price: 2500000, max_occupancy: 6, bed_config: '3 giường King', area: 85 },
  ];

  let rtIdCounter = 1;
  branches.forEach((b) => {
    roomTypeTemplates.forEach((t) => {
      roomTypes.push({
        id: rtIdCounter++,
        apartment_id: b.id,
        name: `${t.name} (${b.name.split(' ')[2]})`,
        base_price: t.base_price,
        max_occupancy: t.max_occupancy,
        description: `Căn hộ cao cấp đầy đủ tiện nghi tại ${b.name}`,
        bed_config: t.bed_config,
        area: t.area,
        is_active: true,
      });
    });
  });

  // 3. 3 Phòng cụ thể mỗi loại = 36 phòng
  const rooms: SeedPayload['rooms'] = [];
  const locks: SeedPayload['locks'] = [];
  let roomIdCounter = 1;
  let lockIdCounter = 1;

  roomTypes.forEach((rt) => {
    const aptPrefix = rt.apartment_id === 1 ? 'B' : rt.apartment_id === 2 ? 'C' : 'H';
    const floor = Math.floor((rt.id - 1) % 4) + 1;

    for (let r = 1; r <= 3; r++) {
      const roomNum = `${aptPrefix}${floor}0${r}`;
      const isMaint = (rt.id === 2 && r === 3) || (rt.id === 7 && r === 2); // 2 phòng bảo trì thử nghiệm

      rooms.push({
        room_id: roomIdCounter,
        apartment_id: rt.apartment_id,
        room_type_id: rt.id,
        room_number: roomNum,
        status: isMaint ? RoomStatus.MAINTENANCE : RoomStatus.AVAILABLE,
        is_hidden: false,
      });

      locks.push({
        id: lockIdCounter,
        room_id: roomIdCounter,
        cloud_lock_id: `LOCK-CLOUD-${roomIdCounter.toString().padStart(4, '0')}`,
        lock_name: `Khóa điện tử phòng ${roomNum}`,
        lock_type: LockType.TTLOCK,
        lock_status: LockStatus.ONLINE,
        battery_level: 90 + (roomIdCounter % 10),
        master_pin: `123456`,
      });

      roomIdCounter++;
      lockIdCounter++;
    }
  });

  // 4. Roles & Staff
  const roles = [
    { role_id: 1, role_name: StaffRole.ADMIN },
    { role_id: 2, role_name: StaffRole.MANAGER },
  ];

  const staff = [
    {
      staff_id: 1,
      role_id: 1,
      apartment_id: null,
      full_name: 'Nguyễn Quản Trị Viên',
      email: 'admin@homestay.vn',
      phone: '0900000001',
      password_hash: '$2b$10$hashed_admin_pass',
    },
    {
      staff_id: 2,
      role_id: 2,
      apartment_id: 1,
      full_name: 'Trần Quản Lý Ba Đình',
      email: 'manager.badinh@homestay.vn',
      phone: '0900000002',
      password_hash: '$2b$10$hashed_manager_pass1',
    },
    {
      staff_id: 3,
      role_id: 2,
      apartment_id: 2,
      full_name: 'Lê Quản Lý Cầu Giấy',
      email: 'manager.caugiay@homestay.vn',
      phone: '0900000003',
      password_hash: '$2b$10$hashed_manager_pass2',
    },
    {
      staff_id: 4,
      role_id: 2,
      apartment_id: 3,
      full_name: 'Phạm Quản Lý Hoàn Kiếm',
      email: 'manager.hoankiem@homestay.vn',
      phone: '0900000004',
      password_hash: '$2b$10$hashed_manager_pass3',
    },
  ];

  // 5. 10 Khách hàng
  const customers = [
    { customer_id: 1, full_name: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com', phone: '0901234567', is_blocked: false, is_hidden: false },
    { customer_id: 2, full_name: 'Trần Thị Bình', email: 'binh.tran@gmail.com', phone: '0912345678', is_blocked: false, is_hidden: false },
    { customer_id: 3, full_name: 'Lê Hoàng Long', email: 'long.le@gmail.com', phone: '0923456789', is_blocked: false, is_hidden: false },
    { customer_id: 4, full_name: 'Phạm Minh Đức', email: 'duc.pham@gmail.com', phone: '0934567890', is_blocked: false, is_hidden: false },
    { customer_id: 5, full_name: 'Hoàng Thu Trang', email: 'trang.hoang@gmail.com', phone: '0945678901', is_blocked: false, is_hidden: false },
    { customer_id: 6, full_name: 'Vũ Hải Yến', email: 'yen.vu@gmail.com', phone: '0956789012', is_blocked: false, is_hidden: false },
    { customer_id: 7, full_name: 'Đặng Quang Huy', email: 'huy.dang@gmail.com', phone: '0967890123', is_blocked: false, is_hidden: false },
    { customer_id: 8, full_name: 'Bùi Thị Mai', email: 'mai.bui@gmail.com', phone: '0978901234', is_blocked: false, is_hidden: false },
    { customer_id: 9, full_name: 'Đỗ Quốc Toàn', email: 'toan.do@gmail.com', phone: '0989012345', is_blocked: false, is_hidden: false },
    { customer_id: 10, full_name: 'Ngô Bảo Châu', email: 'chau.ngo@gmail.com', phone: '0990123456', is_blocked: false, is_hidden: false },
  ];

  // 6. 25 Đơn Booking đa dạng
  const bookings: SeedPayload['bookings'] = [
    // --- 5 pending_payment (hold_expires_at countdown, room_id = null) ---
    {
      id: 1,
      booking_code: 'BK-PEND-001',
      apartment_id: 1,
      customer_id: 1,
      voucher_id: null,
      adults: 2,
      children: 1,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.PENDING_PAYMENT,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch nghỉ dưỡng',
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Khách cần nhận phòng sớm nếu có thể',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() + 25 * 60000).toISOString(), // 25m remaining
      room_type_id: 2,
      assigned_room_id: null,
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Nguyễn Văn An', date_of_birth: '1992-05-15', gender: 'male', phone: '0901234567', email: 'an.nguyen@gmail.com', doc_type: DocType.CCCD, doc_number: '001092001122', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
        { guest_type: GuestType.ADDITIONAL, is_staying: true, full_name: 'Lê Thu Thảo', date_of_birth: '1995-08-20', gender: 'female', phone: '0901234568', email: null, doc_type: DocType.CCCD, doc_number: '001195003344', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
        { guest_type: GuestType.ADDITIONAL, is_staying: true, full_name: 'Nguyễn Minh Quân', date_of_birth: '2019-10-10', gender: 'male', phone: null, email: null, doc_type: DocType.BIRTH_CERT, doc_number: 'BC-2019-01', status: GuestSlotStatus.MANUAL_CHILD, doc_deleted_at: null },
      ],
      transactions: [],
    },
    {
      id: 2,
      booking_code: 'BK-PEND-002',
      apartment_id: 2,
      customer_id: 2,
      voucher_id: null,
      adults: 1,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.DAILY,
      booked_start_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 4).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.PENDING_PAYMENT,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: now.toISOString(),
      stay_reason: 'Công tác',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() + 18 * 60000).toISOString(),
      room_type_id: 5,
      assigned_room_id: null,
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Trần Thị Bình', date_of_birth: '1990-03-12', gender: 'female', phone: '0912345678', email: 'binh.tran@gmail.com', doc_type: DocType.CCCD, doc_number: '001090005566', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [],
    },
    {
      id: 3,
      booking_code: 'BK-PEND-003',
      apartment_id: 3,
      customer_id: 3,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.PENDING_PAYMENT,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() + 3 * 60000).toISOString(), // < 5m NEAR EXPIRY ALERT!
      room_type_id: 11,
      assigned_room_id: null,
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Lê Hoàng Long', date_of_birth: '1988-11-04', gender: 'male', phone: '0923456789', email: 'long.le@gmail.com', doc_type: DocType.CCCD, doc_number: '001088007788', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [],
    },
    {
      id: 4,
      booking_code: 'BK-PEND-004',
      apartment_id: 1,
      customer_id: 4,
      voucher_id: null,
      adults: 2,
      children: 2,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 5).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 6).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.PENDING_PAYMENT,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: now.toISOString(),
      stay_reason: 'Gia đình nghỉ dưỡng',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() + 4 * 60000).toISOString(), // < 5m NEAR EXPIRY ALERT!
      room_type_id: 3,
      assigned_room_id: null,
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Phạm Minh Đức', date_of_birth: '1987-07-22', gender: 'male', phone: '0934567890', email: 'duc.pham@gmail.com', doc_type: DocType.CCCD, doc_number: '001087009900', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [],
    },
    {
      id: 5,
      booking_code: 'BK-PEND-005',
      apartment_id: 2,
      customer_id: 5,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 4).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 5).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.PENDING_PAYMENT,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: now.toISOString(),
      stay_reason: 'Đặt giữ chỗ qua quầy',
      source: BookingSource.ADMIN,
      created_by: 3, // Manager Cầu Giấy
      note: 'Khách hẹn thanh toán tiền mặt lúc 14h',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() + 28 * 60000).toISOString(),
      room_type_id: 6,
      assigned_room_id: null,
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Hoàng Thu Trang', date_of_birth: '1993-09-09', gender: 'female', phone: '0945678901', email: 'trang.hoang@gmail.com', doc_type: DocType.CCCD, doc_number: '001093002233', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [],
    },

    // --- 7 confirmed (assigned room, lock_pin issued, transaction paid) ---
    {
      id: 6,
      booking_code: 'BK-CONF-006',
      apartment_id: 1,
      customer_id: 6,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: null,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 1,
      assigned_room_id: 1, // Phòng B101
      pin: '839201',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Vũ Hải Yến', date_of_birth: '1996-02-14', gender: 'female', phone: '0956789012', email: 'yen.vu@gmail.com', doc_type: DocType.CCCD, doc_number: '001096004455', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 600000, payment_method: 'payos_qr', note: 'Thanh toán PayOS thành công' }],
    },
    {
      id: 7,
      booking_code: 'BK-CONF-007',
      apartment_id: 1,
      customer_id: 7,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: true, // ĐẶT HỘ
      lock_email: 'khach.o.badinh@gmail.com',
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: null,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Đặt cho đối tác công ty',
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Gửi mã PIN về email người ở: khach.o.badinh@gmail.com',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 2,
      assigned_room_id: 4, // Phòng B201
      pin: '194720',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Trần Văn Khách', date_of_birth: '1985-06-18', gender: 'male', phone: '0981112233', email: 'khach.o.badinh@gmail.com', doc_type: DocType.CCCD, doc_number: '001085006677', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 950000, payment_method: 'payos_qr' }],
    },
    {
      id: 8,
      booking_code: 'BK-CONF-008',
      apartment_id: 2,
      customer_id: 8,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.DAILY,
      booked_start_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 4).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: null,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Nghỉ ngơi theo ngày',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 5,
      assigned_room_id: 13, // C101
      pin: '572910',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Bùi Thị Mai', date_of_birth: '1994-12-01', gender: 'female', phone: '0978901234', email: 'mai.bui@gmail.com', doc_type: DocType.CCCD, doc_number: '001094008899', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 600000, payment_method: 'payos_qr' }],
    },
    {
      id: 9,
      booking_code: 'BK-CONF-009',
      apartment_id: 2,
      customer_id: 9,
      voucher_id: null,
      adults: 2,
      children: 1, // TRẺ EM DƯỚI 10 TUỔI (6 tuổi)
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: null,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Gia đình du lịch Hà Nội',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 6,
      assigned_room_id: 16, // C201
      pin: '629401',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Đỗ Quốc Toàn', date_of_birth: '1989-04-10', gender: 'male', phone: '0989012345', email: 'toan.do@gmail.com', doc_type: DocType.CCCD, doc_number: '001089001144', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
        { guest_type: GuestType.ADDITIONAL, is_staying: true, full_name: 'Phạm Hồng Nhung', date_of_birth: '1991-08-15', gender: 'female', phone: '0989012346', email: null, doc_type: DocType.CCCD, doc_number: '001091002255', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
        { guest_type: GuestType.ADDITIONAL, is_staying: true, full_name: 'Đỗ Gia Bảo', date_of_birth: '2020-05-01', gender: 'male', phone: null, email: null, doc_type: null, doc_number: null, status: GuestSlotStatus.MANUAL_CHILD, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 950000, payment_method: 'payos_qr' }],
    },
    {
      id: 10,
      booking_code: 'BK-CONF-010',
      apartment_id: 3,
      customer_id: 10,
      voucher_id: null,
      adults: 2,
      children: 1, // TRẺ EM TRÊN 10 TUỔI (12 tuổi -> cần CCCD/Hộ chiếu)
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 3).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 4).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 1, // Admin đã duyệt
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 11,
      assigned_room_id: 28, // H201
      pin: '401928',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Ngô Bảo Châu', date_of_birth: '1982-10-10', gender: 'male', phone: '0990123456', email: 'chau.ngo@gmail.com', doc_type: DocType.CCCD, doc_number: '001082003366', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
        { guest_type: GuestType.ADDITIONAL, is_staying: true, full_name: 'Ngô Minh Khang', date_of_birth: '2014-03-25', gender: 'male', phone: null, email: null, doc_type: DocType.CCCD, doc_number: '001214005588', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 1450000, payment_method: 'payos_qr' }],
    },
    {
      id: 11,
      booking_code: 'BK-CONF-011',
      apartment_id: 3,
      customer_id: 1,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 4).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 5).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 4, // Manager Hoàn Kiếm
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Tạo tại quầy',
      source: BookingSource.ADMIN, // TẠO THỦ CÔNG
      created_by: 4, // Manager Hoàn Kiếm
      note: 'Khách thanh toán tiền mặt tại quầy',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 2500000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 12,
      assigned_room_id: 31, // H301
      pin: '771920',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Nguyễn Văn An', date_of_birth: '1992-05-15', gender: 'male', phone: '0901234567', email: 'an.nguyen@gmail.com', doc_type: DocType.CCCD, doc_number: '001092001122', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 2500000, payment_method: 'counter_cash', note: 'Thu tiền mặt tại quầy lễ tân' }],
    },
    {
      id: 12,
      booking_code: 'BK-CONF-012',
      apartment_id: 1,
      customer_id: 2,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 6).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 7).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CONFIRMED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: null,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Công tác',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 1,
      assigned_room_id: 2, // B102
      pin: '382910',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Trần Thị Bình', date_of_birth: '1990-03-12', gender: 'female', phone: '0912345678', email: 'binh.tran@gmail.com', doc_type: DocType.CCCD, doc_number: '001090005566', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 600000, payment_method: 'payos_qr' }],
    },

    // --- 4 checked_in (check_in_actual set, currently staying) ---
    {
      id: 13,
      booking_code: 'BK-CHKI-013',
      apartment_id: 1,
      customer_id: 3,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 86400000).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000).toISOString(),
      check_in_actual: new Date(now.getTime() - 18 * 3600000).toISOString(), // Đã check-in hôm qua 14:00
      check_out_actual: null,
      booking_status: BookingStatus.CHECKED_IN,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 2,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Nghỉ dưỡng',
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Đã nhận phòng thành công',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1900000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 2,
      assigned_room_id: 5, // B202
      pin: '918273',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Lê Hoàng Long', date_of_birth: '1988-11-04', gender: 'male', phone: '0923456789', email: 'long.le@gmail.com', doc_type: DocType.CCCD, doc_number: '001088007788', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 1900000, payment_method: 'payos_qr' }],
    },
    {
      id: 14,
      booking_code: 'BK-CHKI-014',
      apartment_id: 2,
      customer_id: 4,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 43200000).toISOString(),
      booked_end_time: new Date(now.getTime() + 43200000).toISOString(),
      check_in_actual: new Date(now.getTime() - 3600000 * 5).toISOString(),
      check_out_actual: null,
      booking_status: BookingStatus.CHECKED_IN,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 3,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Công tác Cầu Giấy',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 6,
      assigned_room_id: 17, // C202
      pin: '654321',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Phạm Minh Đức', date_of_birth: '1987-07-22', gender: 'male', phone: '0934567890', email: 'duc.pham@gmail.com', doc_type: DocType.CCCD, doc_number: '001087009900', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 950000, payment_method: 'payos_qr' }],
    },
    {
      id: 15,
      booking_code: 'BK-CHKI-015',
      apartment_id: 3,
      customer_id: 5,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 3600000 * 10).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000).toISOString(),
      check_in_actual: new Date(now.getTime() - 3600000 * 8).toISOString(),
      check_out_actual: null,
      booking_status: BookingStatus.CHECKED_IN,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 4,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 11,
      assigned_room_id: 29, // H202
      pin: '123456',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Hoàng Thu Trang', date_of_birth: '1993-09-09', gender: 'female', phone: '0945678901', email: 'trang.hoang@gmail.com', doc_type: DocType.CCCD, doc_number: '001093002233', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 1450000, payment_method: 'payos_qr' }],
    },
    {
      id: 16,
      booking_code: 'BK-CHKI-016',
      apartment_id: 1,
      customer_id: 6,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 3600000 * 12).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 2).toISOString(),
      check_in_actual: new Date(now.getTime() - 3600000 * 10).toISOString(),
      check_out_actual: null,
      booking_status: BookingStatus.CHECKED_IN,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 2,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 2500000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 4,
      assigned_room_id: 10, // B401
      pin: '456789',
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Vũ Hải Yến', date_of_birth: '1996-02-14', gender: 'female', phone: '0956789012', email: 'yen.vu@gmail.com', doc_type: DocType.CCCD, doc_number: '001096004455', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 2500000, payment_method: 'payos_qr' }],
    },

    // --- 4 checked_out (check_out_actual set, doc_deleted_at set for privacy) ---
    {
      id: 17,
      booking_code: 'BK-CHKO-017',
      apartment_id: 1,
      customer_id: 7,
      voucher_id: null,
      adults: 1,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 86400000 * 3).toISOString(),
      booked_end_time: new Date(now.getTime() - 86400000 * 2).toISOString(),
      check_in_actual: new Date(now.getTime() - 86400000 * 3 + 3600000 * 14).toISOString(),
      check_out_actual: new Date(now.getTime() - 86400000 * 2 + 3600000 * 11).toISOString(),
      booking_status: BookingStatus.CHECKED_OUT,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 2,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Công tác',
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Khách trả phòng đúng giờ',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 1,
      assigned_room_id: 3, // B103
      pin: null, // Thu hồi sau check-out
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Đặng Quang Huy', date_of_birth: '1991-01-20', gender: 'male', phone: '0967890123', email: 'huy.dang@gmail.com', doc_type: DocType.CCCD, doc_number: '001091007788', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: new Date(now.getTime() - 86400000 * 2 + 3600000 * 11).toISOString() }, // ĐÃ XÓA ẢNH THEO CHÍNH SÁCH
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 600000, payment_method: 'payos_qr' }],
    },
    {
      id: 18,
      booking_code: 'BK-CHKO-018',
      apartment_id: 2,
      customer_id: 8,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 86400000 * 4).toISOString(),
      booked_end_time: new Date(now.getTime() - 86400000 * 2).toISOString(),
      check_in_actual: new Date(now.getTime() - 86400000 * 4 + 3600000 * 15).toISOString(),
      check_out_actual: new Date(now.getTime() - 86400000 * 2 + 3600000 * 10).toISOString(),
      booking_status: BookingStatus.CHECKED_OUT,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 3,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1900000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 6,
      assigned_room_id: 18, // C203
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Bùi Thị Mai', date_of_birth: '1994-12-01', gender: 'female', phone: '0978901234', email: 'mai.bui@gmail.com', doc_type: DocType.CCCD, doc_number: '001094008899', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: new Date(now.getTime() - 86400000 * 2).toISOString() },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 1900000, payment_method: 'payos_qr' }],
    },
    {
      id: 19,
      booking_code: 'BK-CHKO-019',
      apartment_id: 3,
      customer_id: 9,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 86400000 * 5).toISOString(),
      booked_end_time: new Date(now.getTime() - 86400000 * 3).toISOString(),
      check_in_actual: new Date(now.getTime() - 86400000 * 5 + 3600000 * 14).toISOString(),
      check_out_actual: new Date(now.getTime() - 86400000 * 3 + 3600000 * 12).toISOString(),
      booking_status: BookingStatus.CHECKED_OUT,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 4,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 2900000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 11,
      assigned_room_id: 30, // H203
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Đỗ Quốc Toàn', date_of_birth: '1989-04-10', gender: 'male', phone: '0989012345', email: 'toan.do@gmail.com', doc_type: DocType.CCCD, doc_number: '001089001144', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: new Date(now.getTime() - 86400000 * 3).toISOString() },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 2900000, payment_method: 'payos_qr' }],
    },
    {
      id: 20,
      booking_code: 'BK-CHKO-020',
      apartment_id: 1,
      customer_id: 10,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() - 86400000 * 2).toISOString(),
      booked_end_time: new Date(now.getTime() - 86400000).toISOString(),
      check_in_actual: new Date(now.getTime() - 86400000 * 2 + 3600000 * 14).toISOString(),
      check_out_actual: new Date(now.getTime() - 86400000 + 3600000 * 11).toISOString(),
      booking_status: BookingStatus.CHECKED_OUT,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 2,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Công tác',
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 3,
      assigned_room_id: 7, // B301
      pin: null,
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Ngô Bảo Châu', date_of_birth: '1982-10-10', gender: 'male', phone: '0990123456', email: 'chau.ngo@gmail.com', doc_type: DocType.CCCD, doc_number: '001082003366', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: new Date(now.getTime() - 86400000).toISOString() },
      ],
      transactions: [{ type: TransactionType.PAYMENT, amount: 1450000, payment_method: 'payos_qr' }],
    },

    // --- 3 expired (quá hạn giữ chỗ, room_id = null) ---
    {
      id: 21,
      booking_code: 'BK-EXPI-021',
      apartment_id: 1,
      customer_id: 1,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 5).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 6).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.EXPIRED,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: null,
      stay_reason: null,
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Hết hạn giữ chỗ sau 30 phút không thanh toán',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() - 3600000 * 2).toISOString(),
      room_type_id: 1,
      assigned_room_id: null,
      pin: null,
      guests: [],
      transactions: [],
    },
    {
      id: 22,
      booking_code: 'BK-EXPI-022',
      apartment_id: 2,
      customer_id: 2,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 7).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 8).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.EXPIRED,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: null,
      stay_reason: null,
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Hết hạn thanh toán trực tuyến',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 950000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() - 3600000 * 4).toISOString(),
      room_type_id: 6,
      assigned_room_id: null,
      pin: null,
      guests: [],
      transactions: [],
    },
    {
      id: 23,
      booking_code: 'BK-EXPI-023',
      apartment_id: 3,
      customer_id: 3,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 8).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 9).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.EXPIRED,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: null,
      stay_reason: null,
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Khách không hoàn tất bước chuyển khoản',
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: new Date(now.getTime() - 3600000 * 1).toISOString(),
      room_type_id: 11,
      assigned_room_id: null,
      pin: null,
      guests: [],
      transactions: [],
    },

    // --- 2 cancelled (1 unpaid hủy từ pending, 1 paid hủy từ confirmed + hoàn tiền) ---
    {
      id: 24,
      booking_code: 'BK-CANC-024',
      apartment_id: 1,
      customer_id: 4,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 6).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 7).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CANCELLED,
      verification_status: VerificationStatus.PENDING,
      reviewed_by: null,
      reviewed_at: null,
      consent_at: null,
      stay_reason: null,
      source: BookingSource.ONLINE,
      created_by: null,
      note: null,
      cancel_reason: 'Khách chủ động hủy khi chưa thanh toán',
      cancelled_at: new Date(now.getTime() - 3600000 * 3).toISOString(),
      cancelled_by: null, // Khách hủy
      total_price: 600000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 1,
      assigned_room_id: null,
      pin: null,
      guests: [],
      transactions: [],
    },
    {
      id: 25,
      booking_code: 'BK-CANC-025',
      apartment_id: 3,
      customer_id: 5,
      voucher_id: null,
      adults: 2,
      children: 0,
      is_booked_for_other: false,
      lock_email: null,
      booking_type: BookingType.OVERNIGHT,
      booked_start_time: new Date(now.getTime() + 86400000 * 10).toISOString(),
      booked_end_time: new Date(now.getTime() + 86400000 * 11).toISOString(),
      check_in_actual: null,
      check_out_actual: null,
      booking_status: BookingStatus.CANCELLED,
      verification_status: VerificationStatus.PASSED,
      reviewed_by: 1,
      reviewed_at: now.toISOString(),
      consent_at: now.toISOString(),
      stay_reason: 'Du lịch',
      source: BookingSource.ONLINE,
      created_by: null,
      note: 'Admin duyệt hoàn tiền 100% qua chính sách linh hoạt',
      cancel_reason: 'Khách hủy chuyến bay do bão, yêu cầu hoàn tiền',
      cancelled_at: new Date(now.getTime() - 3600000 * 2).toISOString(),
      cancelled_by: 1, // Admin hủy
      total_price: 1450000,
      discount_amount: 0,
      hold_expires_at: null,
      room_type_id: 11,
      assigned_room_id: null, // Đã giải phóng phòng
      pin: null, // Đã thu hồi pin
      guests: [
        { guest_type: GuestType.PRIMARY, is_staying: true, full_name: 'Hoàng Thu Trang', date_of_birth: '1993-09-09', gender: 'female', phone: '0945678901', email: 'trang.hoang@gmail.com', doc_type: DocType.CCCD, doc_number: '001093002233', status: GuestSlotStatus.CONFIRMED, doc_deleted_at: null },
      ],
      transactions: [
        { type: TransactionType.PAYMENT, amount: 1450000, payment_method: 'payos_qr', note: 'Thanh toán ban đầu' },
        { type: TransactionType.REFUND, amount: 1450000, payment_method: 'bank_transfer', note: 'Hoàn tiền cho khách theo lệnh hủy đơn của Admin' },
      ],
    },
  ];

  return {
    branches,
    roomTypes,
    rooms,
    locks,
    roles,
    staff,
    customers,
    bookings,
  };
}
