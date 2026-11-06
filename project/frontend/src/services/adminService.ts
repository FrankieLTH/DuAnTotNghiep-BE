import api from './api';

export type StaffRole = 'admin' | 'manager';

export interface AdminBookingItem {
  id: number;
  booking_code: string;
  booking_type: 'overnight' | 'daily';
  booking_status: 'draft' | 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'expired' | 'cancelled';
  booked_start_time: string;
  booked_end_time: string;
  check_in_actual?: string;
  check_out_actual?: string;
  hold_expires_at?: string;
  hold_remaining_seconds?: number;
  is_hold_expired?: boolean;
  adults: number;
  children: number;
  is_booked_for_other?: boolean | number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  verification_status: 'pending' | 'passed' | 'manual_review' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  stay_reason?: string;
  created_at: string;
  rooms?: Array<{
    booking_room_id: number;
    room_types_id: number;
    room_id?: number | null;
    room_type_name: string;
    room_number?: string | null;
    base_price: number;
    concrete_room_status?: string;
  }>;
  guests?: Array<{
    id: number;
    name: string;
    date_of_birth?: string;
    guest_type: string;
    is_booker: boolean;
    is_staying: boolean;
    doc_type: string;
    doc_number: string;
    doc_number_masked?: string;
    doc_image_front?: string;
    doc_deleted_at?: string;
    status: string;
    ocr_confidence?: number;
  }>;
  lock_pins?: any[];
  transactions?: any[];
}

export interface VerificationQueueItem {
  guest_id: number;
  name: string;
  date_of_birth: string;
  doc_type: string;
  doc_number: string;
  doc_image_front?: string;
  ocr_confidence?: number;
  guest_doc_status: string;
  booking_id: number;
  booking_code: string;
  verification_status: string;
  booked_start_time: string;
  booked_end_time: string;
  created_at: string;
}

export interface AdminCustomerItem {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  is_blocked: boolean | number;
  is_hidden?: boolean | number;
  created_at: string;
  account_type: 'REGISTERED' | 'GUEST_UNACTIVATED';
  total_bookings_count: number;
  bookings?: any[];
}

export interface AdminLockPinItem {
  id: number;
  booking_id: number;
  lock_id: number;
  pin: string;
  lock_pin_start_time: string;
  lock_pin_end_time: string;
  pin_status: string;
  booking_code: string;
  booking_status: string;
  verification_status: string;
  customer_name?: string;
  customer_email?: string;
  room_number?: string;
  lock_name?: string;
}

export interface EmergencyAlertItem {
  id: string;
  booking_id: number;
  booking_code: string;
  room_types_id: number;
  previous_room_id: number;
  reason: string;
  created_at: string;
  severity: 'URGENT' | 'HIGH';
}

export interface RetentionStatsResponse {
  stats: {
    deleted_photos_count: number;
    pending_photo_deletions_count: number;
    anonymized_guests_count: number;
    upcoming_anonymization_count: number;
    retention_config: {
      photoDeleteGraceDaysAfterCheckout: number;
      dataAnonymizeMonthsAfterCheckout: number;
    };
  };
  execution_logs: Array<{
    id: string;
    job_type: string;
    executed_at: string;
    records_processed: number;
    status: string;
    details: string;
  }>;
}

export interface AuditLogItem {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

// ============================================================
// API CLIENT CALLS
// ============================================================
const getHeaders = (role: StaffRole, actor?: string) => ({
  headers: {
    'x-staff-role': role,
    'x-staff-actor': actor || `${role}_user@homestay.com`,
  },
});

// ============================================================
// VALIDATION HELPERS (SĐT & EMAIL / GMAIL)
// ============================================================
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
};

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
};

// ============================================================
// TYPES FOR NEW ENDPOINTS
// ============================================================
export interface BranchItem {
  id: number;
  name: string;
  address: string;
  hotline: string;
  status: 'active' | 'hidden';
  created_at: string;
  updated_at: string;
  total_rooms: number;
  available_rooms: number;
  maintenance_rooms: number;
  hidden_rooms: number;
  active_future_bookings?: number;
}

export interface RoomTypeItem {
  id: number;
  name: string;
  apartment_id: number;
  apartment_name: string;
  base_price: number;
  max_occupancy: number;
  description?: string;
  bed_config?: string;
  area?: number;
  is_active: boolean;
  created_at: string;
  total_rooms: number;
  active_rooms: number;
  images?: Array<{ id: number; image_url: string; sort_order: number }>;
  amenities?: Array<{ id: number; name: string }>;
}

export interface RoomItem {
  room_id: number;
  room_number: string;
  apartment_id: number;
  apartment_name: string;
  room_type_id: number;
  room_type_name: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  is_hidden: boolean;
  created_at: string;
  lock_id?: number;
  lock_name?: string;
  lock_status?: string;
  battery_level?: number;
  last_sync_at?: string;
  is_ready_for_booking: boolean;
}

export interface LockItem {
  id: number;
  lock_name: string;
  lock_status?: string;
  battery_level?: number;
}

// ============================================================
// SIMULATOR STORAGE HELPERS (PERSISTENT IN LOCALSTORAGE)
// ============================================================
const LS_SIM_PREFIX = 'homestay_admin_sim_';

function getSimData<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(LS_SIM_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultVal;
}

function setSimData<T>(key: string, val: T): void {
  try {
    localStorage.setItem(LS_SIM_PREFIX + key, JSON.stringify(val));
  } catch {}
}

const defaultBranches: BranchItem[] = [
  {
    id: 1,
    name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    hotline: '0903123456',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    total_rooms: 8,
    available_rooms: 6,
    maintenance_rooms: 1,
    hidden_rooms: 1,
    active_future_bookings: 3,
  },
  {
    id: 2,
    name: 'Chi nhánh 2 – Bãi Trước / Núi Lớn',
    address: 'Đường Vi Ba, Phường 1, TP. Vũng Tàu',
    hotline: '0903789123',
    status: 'active',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    total_rooms: 6,
    available_rooms: 5,
    maintenance_rooms: 0,
    hidden_rooms: 1,
    active_future_bookings: 2,
  },
];

const defaultAdminRoomTypes: RoomTypeItem[] = [
  {
    id: 1,
    name: 'Sunset Penthouse & Jacuzzi 270°',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    base_price: 1890000,
    max_occupancy: 4,
    description: 'Phòng penthouse tầng cao với jacuzzi ngoài trời và tầm nhìn 270 độ hướng biển.',
    bed_config: '1 giường King',
    area: 65,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    total_rooms: 2,
    active_rooms: 2,
    images: [{ id: 1, image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', sort_order: 1 }],
    amenities: [{ id: 1, name: 'Jacuzzi' }, { id: 2, name: 'Tầm nhìn biển' }],
  },
  {
    id: 2,
    name: 'Sea View Balcony Room',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    base_price: 850000,
    max_occupancy: 2,
    description: 'Phòng tiêu chuẩn view biển, ban công riêng.',
    bed_config: '1 giường đôi',
    area: 32,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    total_rooms: 4,
    active_rooms: 4,
    images: [],
    amenities: [{ id: 2, name: 'Tầm nhìn biển' }, { id: 3, name: 'Ban công' }],
  },
  {
    id: 3,
    name: 'Garden Bungalow',
    apartment_id: 2,
    apartment_name: 'Chi nhánh 2 – Bãi Trước / Núi Lớn',
    base_price: 650000,
    max_occupancy: 3,
    description: 'Bungalow gần sân vườn, yên tĩnh và thoáng mát.',
    bed_config: '1 giường đôi + 1 giường đơn',
    area: 40,
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    total_rooms: 3,
    active_rooms: 3,
    images: [],
    amenities: [{ id: 4, name: 'Sân vườn' }],
  },
];

const defaultAdminRooms: RoomItem[] = [
  {
    room_id: 1,
    room_number: 'P101',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 1,
    room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
    status: 'available',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    lock_id: 1,
    lock_name: 'Khóa TTLock P101',
    lock_status: 'online',
    battery_level: 85,
    is_ready_for_booking: true,
  },
  {
    room_id: 2,
    room_number: 'P102',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 1,
    room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
    status: 'maintenance',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    lock_id: 2,
    lock_name: 'Khóa TTLock P102',
    lock_status: 'offline',
    battery_level: 12,
    is_ready_for_booking: false,
  },
  {
    room_id: 3,
    room_number: 'P201',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 2,
    room_type_name: 'Sea View Balcony Room',
    status: 'available',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    is_ready_for_booking: false,
  },
];

const defaultCustomers: AdminCustomerItem[] = [
  {
    id: 1,
    full_name: 'Nguyễn Nhật Huy',
    email: 'huy.nguyen@example.com',
    phone: '0901234567',
    is_blocked: 0,
    is_hidden: 0,
    account_type: 'REGISTERED',
    created_at: '2026-10-01 10:00:00',
    total_bookings_count: 3,
    bookings: [
      {
        code: 'BK-89021',
        branchName: 'Chi nhánh 1 – Triền Núi Nhỏ',
        roomTypeName: 'Sunset Penthouse & Jacuzzi 270°',
        checkIn: '20/11/2026',
        totalAmount: 1890000,
        status: 'confirmed',
      },
    ],
  },
  {
    id: 2,
    full_name: 'Khách vãng lai Đặt phòng',
    email: 'guest.order@example.com',
    phone: '0988776655',
    is_blocked: 0,
    is_hidden: 0,
    account_type: 'GUEST_UNACTIVATED',
    created_at: '2026-11-02 15:30:00',
    total_bookings_count: 1,
    bookings: [],
  },
];

export const getSimBranches = (): BranchItem[] => getSimData('branches', defaultBranches);
export const saveSimBranches = (d: BranchItem[]) => setSimData('branches', d);

export const getSimRoomTypes = (): RoomTypeItem[] => getSimData('room_types', defaultAdminRoomTypes);
export const saveSimRoomTypes = (d: RoomTypeItem[]) => setSimData('room_types', d);

export const getSimRooms = (): RoomItem[] => getSimData('rooms', defaultAdminRooms);
export const saveSimRooms = (d: RoomItem[]) => setSimData('rooms', d);

export const getSimCustomers = (): AdminCustomerItem[] => getSimData('customers', defaultCustomers);
export const saveSimCustomers = (d: AdminCustomerItem[]) => setSimData('customers', d);

// ============================================================
// SIMULATOR STORE — BOOKING
// ============================================================

export interface SimBookingItem {
  id: number;
  booking_code: string;
  booking_type: 'overnight' | 'daily' | 'extended';
  booking_status: 'draft' | 'pending_payment' | 'confirmed' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled';
  booked_start_time: string;
  booked_end_time: string;
  check_in_actual?: string;
  check_out_actual?: string;
  hold_expires_at?: string;
  hold_remaining_seconds?: number;
  is_hold_expired?: boolean;
  adults: number;
  children: number;
  source: 'online' | 'admin';
  total_amount: number;
  paid_amount?: number;
  cancel_reason?: string;
  cancelled_at?: string;
  refund_amount?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_cccd?: string;
  verification_status: 'pending' | 'passed' | 'manual_review' | 'rejected';
  created_at: string;
  rooms?: Array<{
    booking_room_id: number;
    room_types_id: number;
    room_id?: number | null;
    room_type_name: string;
    room_number?: string | null;
    base_price: number;
    concrete_room_status?: string;
  }>;
  guests?: Array<{
    id: number;
    name: string;
    date_of_birth?: string;
    guest_type: string;
    is_booker: boolean;
    is_staying: boolean;
    doc_type: string;
    doc_number: string;
    doc_number_masked?: string;
    status: string;
    ocr_confidence?: number;
  }>;
  transactions?: Array<{
    id: number;
    type: 'payment' | 'refund';
    amount: number;
    created_at: string;
    note?: string;
  }>;
}

// Hàm sinh booking_code
let _simBookingSeq = 600;
function genBookingCode(): string {
  _simBookingSeq++;
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `BK-${ym}-${_simBookingSeq}`;
}

// Hàm tính giờ check-in/out theo loại lưu trú
function getStayTimes(type: 'overnight' | 'daily' | 'extended') {
  const cfg: Record<string, { checkIn: string; checkOut: string }> = {
    overnight: { checkIn: '19:00', checkOut: '12:00' },
    daily:     { checkIn: '07:00', checkOut: '17:00' },
    extended:  { checkIn: '14:00', checkOut: '12:00' },
  };
  return cfg[type] || cfg.extended;
}

// Hàm tính hệ số giá theo loại lưu trú
function getPriceMultiplier(type: 'overnight' | 'daily' | 'extended'): number {
  if (type === 'extended') return 1.0;
  return 0.7; // overnight, daily
}

// Hàm kiểm tra xem giờ hiện tại đã đến giờ check-in chưa
function isCheckInTimeReached(checkInDateStr: string, checkInTime: string): boolean {
  const now = new Date();
  const [ciHour, ciMin] = checkInTime.split(':').map(Number);
  const checkInDate = new Date(checkInDateStr);
  checkInDate.setHours(ciHour, ciMin, 0, 0);
  return now >= checkInDate;
}

// Dữ liệu mẫu booking mặc định — đủ 6 trạng thái
function buildDefaultBookings(): SimBookingItem[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  return [
    // 1. Chưa thanh toán (pending_payment)
    {
      id: 101,
      booking_code: 'BK-202611-101',
      booking_type: 'overnight',
      booking_status: 'pending_payment',
      booked_start_time: `${fmt(addDays(today, 5))} 19:00:00`,
      booked_end_time: `${fmt(addDays(today, 6))} 12:00:00`,
      hold_expires_at: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      hold_remaining_seconds: 18 * 60,
      is_hold_expired: false,
      adults: 2, children: 1,
      source: 'online',
      total_amount: 1323000,
      customer_name: 'Nguyễn Nhật Huy',
      customer_email: 'huy.nguyen@example.com',
      customer_phone: '0901234567',
      verification_status: 'pending',
      created_at: new Date().toISOString(),
      rooms: [{
        booking_room_id: 1, room_types_id: 1,
        room_id: null, room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
        room_number: null, base_price: 1890000,
      }],
      guests: [{
        id: 1, name: 'Nguyễn Nhật Huy', date_of_birth: '1995-08-20',
        guest_type: 'adult', is_booker: true, is_staying: true,
        doc_type: 'cccd', doc_number: '079195001234',
        doc_number_masked: '0791****234', status: 'confirmed',
      }],
    },
    // 2. Thành công (confirmed) — đã gán phòng
    {
      id: 202,
      booking_code: 'BK-202611-202',
      booking_type: 'daily',
      booking_status: 'confirmed',
      booked_start_time: `${fmt(addDays(today, 3))} 07:00:00`,
      booked_end_time: `${fmt(addDays(today, 3))} 17:00:00`,
      adults: 2, children: 0,
      source: 'online',
      total_amount: 595000,
      paid_amount: 595000,
      customer_name: 'Lê Hoàng Nam',
      customer_email: 'nam.le@example.com',
      customer_phone: '0912345678',
      verification_status: 'passed',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      rooms: [{
        booking_room_id: 2, room_types_id: 2,
        room_id: 3, room_type_name: 'Sea View Balcony Room',
        room_number: 'P201', base_price: 850000,
        concrete_room_status: 'available',
      }],
      guests: [{
        id: 4, name: 'Lê Hoàng Nam',
        guest_type: 'adult', is_booker: true, is_staying: true,
        doc_type: 'cccd', doc_number: '034200001234',
        doc_number_masked: '0342****234', status: 'confirmed',
      }],
      transactions: [{ id: 1, type: 'payment', amount: 595000, created_at: new Date(Date.now() - 3600000).toISOString() }],
    },
    // 3. Đang lưu trú (checked_in)
    {
      id: 303,
      booking_code: 'BK-202611-303',
      booking_type: 'extended',
      booking_status: 'checked_in',
      booked_start_time: `${fmt(today)} 14:00:00`,
      booked_end_time: `${fmt(addDays(today, 1))} 12:00:00`,
      check_in_actual: new Date(Date.now() - 7200000).toISOString(),
      adults: 2, children: 0,
      source: 'admin',
      total_amount: 1890000,
      paid_amount: 1890000,
      customer_name: 'Trần Thị Mai',
      customer_email: 'mai.tran@example.com',
      customer_phone: '0978123456',
      customer_cccd: '079198008899',
      verification_status: 'passed',
      created_at: new Date(Date.now() - 8000000).toISOString(),
      rooms: [{
        booking_room_id: 3, room_types_id: 1,
        room_id: 1, room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
        room_number: 'P101', base_price: 1890000,
        concrete_room_status: 'occupied',
      }],
      guests: [{
        id: 5, name: 'Trần Thị Mai',
        guest_type: 'adult', is_booker: true, is_staying: true,
        doc_type: 'cccd', doc_number: '079198008899',
        doc_number_masked: '0791****899', status: 'confirmed',
      }],
      transactions: [{ id: 2, type: 'payment', amount: 1890000, created_at: new Date(Date.now() - 8000000).toISOString(), note: 'Thu tại quầy' }],
    },
    // 4. Hoàn tất (checked_out)
    {
      id: 404,
      booking_code: 'BK-202611-404',
      booking_type: 'overnight',
      booking_status: 'checked_out',
      booked_start_time: `${fmt(addDays(today, -2))} 19:00:00`,
      booked_end_time: `${fmt(addDays(today, -1))} 12:00:00`,
      check_in_actual: new Date(Date.now() - 2 * 86400000).toISOString(),
      check_out_actual: new Date(Date.now() - 86400000).toISOString(),
      adults: 1, children: 0,
      source: 'online',
      total_amount: 1323000,
      paid_amount: 1323000,
      customer_name: 'Phạm Quỳnh Anh',
      customer_email: 'anh.pham@example.com',
      customer_phone: '0909123456',
      verification_status: 'passed',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      rooms: [{
        booking_room_id: 4, room_types_id: 1,
        room_id: 1, room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
        room_number: 'P101', base_price: 1890000,
      }],
      guests: [{
        id: 6, name: 'Phạm Quỳnh Anh',
        guest_type: 'adult', is_booker: true, is_staying: true,
        doc_type: 'cccd', doc_number: '079192004561',
        doc_number_masked: '0791****561', status: 'confirmed',
      }],
    },
    // 5. Đã hủy — check-in cách hôm nay 15 ngày → ĐƯỢC HOÀN TIỀN
    {
      id: 505,
      booking_code: 'BK-202611-505',
      booking_type: 'overnight',
      booking_status: 'cancelled',
      booked_start_time: `${fmt(addDays(today, 15))} 19:00:00`,
      booked_end_time: `${fmt(addDays(today, 16))} 12:00:00`,
      adults: 2, children: 0,
      source: 'online',
      total_amount: 1323000,
      paid_amount: 1323000,
      cancel_reason: 'Khách đổi lịch',
      cancelled_at: new Date().toISOString(),
      customer_name: 'Đinh Văn Bình',
      customer_email: 'binh.dinh@example.com',
      customer_phone: '0934567890',
      verification_status: 'passed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      rooms: [{
        booking_room_id: 5, room_types_id: 1,
        room_id: null, room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
        room_number: null, base_price: 1890000,
      }],
      guests: [],
    },
    // 6. Đã hủy — check-in cách hôm nay 3 ngày → KHÔNG được hoàn tiền
    {
      id: 606,
      booking_code: 'BK-202611-606',
      booking_type: 'daily',
      booking_status: 'cancelled',
      booked_start_time: `${fmt(addDays(today, 3))} 07:00:00`,
      booked_end_time: `${fmt(addDays(today, 3))} 17:00:00`,
      adults: 2, children: 1,
      source: 'online',
      total_amount: 455000,
      paid_amount: 455000,
      cancel_reason: 'Hủy muộn, không đủ điều kiện hoàn tiền',
      cancelled_at: new Date().toISOString(),
      customer_name: 'Vũ Thị Lan',
      customer_email: 'lan.vu@example.com',
      customer_phone: '0923456789',
      verification_status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      rooms: [{
        booking_room_id: 6, room_types_id: 2,
        room_id: null, room_type_name: 'Sea View Balcony Room',
        room_number: null, base_price: 850000,
      }],
      guests: [],
    },
  ];
}

export const getSimBookings = (): SimBookingItem[] => getSimData('bookings', buildDefaultBookings());
export const saveSimBookings = (d: SimBookingItem[]) => setSimData('bookings', d);

export const adminApi = {
  // ============================================================
  // CHI NHÁNH (BRANCHES)
  // ============================================================
  getBranches: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/branches', getHeaders(role));
      if (Array.isArray(res.data) && res.data.length > 0) {
        saveSimBranches(res.data);
        return res.data as BranchItem[];
      }
    } catch {}
    return getSimBranches();
  },

  getBranchById: async (id: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/branches/${id}`, getHeaders(role));
      return res.data as BranchItem;
    } catch {
      return getSimBranches().find(b => b.id === id) || getSimBranches()[0];
    }
  },

  createBranch: async (data: { name: string; address: string; hotline: string; status?: string }, role: StaffRole) => {
    try {
      const res = await api.post('/admin/branches', data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBranches();
      const newId = list.length > 0 ? Math.max(...list.map(b => b.id)) + 1 : 1;
      const newBranch: BranchItem = {
        id: newId,
        name: data.name,
        address: data.address,
        hotline: data.hotline,
        status: (data.status as any) || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_rooms: 0,
        available_rooms: 0,
        maintenance_rooms: 0,
        hidden_rooms: 0,
        active_future_bookings: 0,
      };
      list.unshift(newBranch);
      saveSimBranches(list);
      return { success: true, id: newId, message: 'Thêm chi nhánh mới thành công!' };
    }
  },

  updateBranch: async (id: number, data: Partial<{ name: string; address: string; hotline: string; status: 'active' | 'hidden' }>, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/branches/${id}`, data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBranches();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        saveSimBranches(list);
      }
      return { success: true, message: 'Cập nhật thông tin chi nhánh thành công!' };
    }
  },

  hideBranch: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/branches/${id}/hide`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBranches();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].status = 'hidden';
        list[idx].updated_at = new Date().toISOString();
        saveSimBranches(list);
      }
      return { success: true, message: 'Đã tạm ẩn chi nhánh!' };
    }
  },

  activateBranch: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/branches/${id}/activate`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBranches();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].status = 'active';
        list[idx].updated_at = new Date().toISOString();
        saveSimBranches(list);
      }
      return { success: true, message: 'Đã kích hoạt lại chi nhánh!' };
    }
  },

  // ============================================================
  // LOẠI PHÒNG (ROOM TYPES)
  // ============================================================
  getAdminRoomTypes: async (role: StaffRole, apartmentId?: number) => {
    try {
      const params = apartmentId ? `?apartment_id=${apartmentId}` : '';
      const res = await api.get(`/admin/room-types${params}`, getHeaders(role));
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data as RoomTypeItem[];
      }
    } catch {}
    const list = getSimRoomTypes();
    if (apartmentId) {
      return list.filter(r => r.apartment_id === Number(apartmentId));
    }
    return list;
  },

  getRoomTypeById: async (id: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/room-types/${id}`, getHeaders(role));
      return res.data as RoomTypeItem;
    } catch {
      return getSimRoomTypes().find(r => r.id === id) || getSimRoomTypes()[0];
    }
  },

  createRoomType: async (data: any, role: StaffRole) => {
    try {
      const res = await api.post('/admin/room-types', data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRoomTypes();
      const newId = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
      const branches = getSimBranches();
      const apt = branches.find(b => b.id === Number(data.apartment_id));
      const newRt: RoomTypeItem = {
        id: newId,
        name: data.name,
        apartment_id: Number(data.apartment_id),
        apartment_name: apt?.name || `Chi nhánh #${data.apartment_id}`,
        base_price: Number(data.base_price || 0),
        max_occupancy: Number(data.max_occupancy || 2),
        description: data.description || '',
        bed_config: data.bed_config || '1 giường đôi',
        area: Number(data.area || 30),
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
        created_at: new Date().toISOString(),
        total_rooms: 0,
        active_rooms: 0,
        images: [],
        amenities: [],
      };
      list.unshift(newRt);
      saveSimRoomTypes(list);
      return { success: true, id: newId, message: 'Thêm loại phòng thành công!' };
    }
  },

  updateRoomType: async (id: number, data: any, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/room-types/${id}`, data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRoomTypes();
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        saveSimRoomTypes(list);
      }
      return { success: true, message: 'Cập nhật loại phòng thành công!' };
    }
  },

  hideRoomType: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/room-types/${id}/hide`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRoomTypes();
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx].is_active = false;
        saveSimRoomTypes(list);
      }
      return { success: true, message: 'Đã ẩn loại phòng!' };
    }
  },

  // ============================================================
  // PHÒNG (ROOMS)
  // ============================================================
  getRooms: async (role: StaffRole, filters?: { apartment_id?: number; room_type_id?: number; status?: string; is_hidden?: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.apartment_id) params.set('apartment_id', String(filters.apartment_id));
      if (filters?.room_type_id) params.set('room_type_id', String(filters.room_type_id));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.is_hidden !== undefined) params.set('is_hidden', String(filters.is_hidden));
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/rooms${query}`, getHeaders(role));
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data as RoomItem[];
      }
    } catch {}
    let list = getSimRooms();
    if (filters?.apartment_id) {
      list = list.filter(r => r.apartment_id === Number(filters.apartment_id));
    }
    if (filters?.room_type_id) {
      list = list.filter(r => r.room_type_id === Number(filters.room_type_id));
    }
    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }
    return list;
  },

  getRoomById: async (id: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/rooms/${id}`, getHeaders(role));
      return res.data as RoomItem;
    } catch {
      return getSimRooms().find(r => r.room_id === id) || getSimRooms()[0];
    }
  },

  createRoom: async (data: { apartment_id: number; room_type_id: number; room_number: string; status?: string; lock_id?: number | null }, role: StaffRole) => {
    try {
      const res = await api.post('/admin/rooms', data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const newId = list.length > 0 ? Math.max(...list.map(r => r.room_id)) + 1 : 1;
      const branches = getSimBranches();
      const rts = getSimRoomTypes();
      const apt = branches.find(b => b.id === Number(data.apartment_id));
      const rt = rts.find(r => r.id === Number(data.room_type_id));
      const newRoom: RoomItem = {
        room_id: newId,
        room_number: data.room_number,
        apartment_id: Number(data.apartment_id),
        apartment_name: apt?.name || `Chi nhánh #${data.apartment_id}`,
        room_type_id: Number(data.room_type_id),
        room_type_name: rt?.name || 'Phòng tiêu chuẩn',
        status: (data.status as any) || 'available',
        is_hidden: false,
        created_at: new Date().toISOString(),
        is_ready_for_booking: (data.status || 'available') === 'available',
      };
      list.unshift(newRoom);
      saveSimRooms(list);
      if (rt) {
        rt.total_rooms = (rt.total_rooms || 0) + 1;
        saveSimRoomTypes(rts);
      }
      if (apt) {
        apt.total_rooms = (apt.total_rooms || 0) + 1;
        apt.available_rooms = (apt.available_rooms || 0) + 1;
        saveSimBranches(branches);
      }
      return { success: true, room_id: newId, message: 'Thêm phòng thành công!' };
    }
  },

  updateRoom: async (id: number, data: any, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/rooms/${id}`, data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const idx = list.findIndex(r => r.room_id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        saveSimRooms(list);
      }
      return { success: true, message: 'Cập nhật phòng thành công!' };
    }
  },

  updateRoomStatus: async (id: number, status: 'available' | 'occupied' | 'cleaning' | 'maintenance', reason: string, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/rooms/${id}/status`, { status, reason }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const idx = list.findIndex(r => r.room_id === id);
      if (idx !== -1) {
        list[idx].status = status;
        saveSimRooms(list);
      }
      const labels: Record<string, string> = {
        available: 'Trống',
        occupied: 'Đang lưu trú',
        cleaning: 'Cần dọn dẹp',
        maintenance: 'Bảo trì',
      };
      return { success: true, message: `Đã chuyển phòng sang trạng thái "${labels[status] || status}"!` };
    }
  },

  hideRoom: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/rooms/${id}/hide`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const idx = list.findIndex(r => r.room_id === id);
      if (idx !== -1) {
        list[idx].is_hidden = true;
        saveSimRooms(list);
      }
      return { success: true, message: 'Đã ẩn phòng thành công!' };
    }
  },

  unhideRoom: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/rooms/${id}/unhide`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const idx = list.findIndex(r => r.room_id === id);
      if (idx !== -1) {
        list[idx].is_hidden = false;
        saveSimRooms(list);
      }
      return { success: true, message: 'Đã hiển thị lại phòng thành công!' };
    }
  },

  assignLock: async (roomId: number, lockId: number | null, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/rooms/${roomId}/assign-lock`, { lock_id: lockId }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimRooms();
      const idx = list.findIndex(r => r.room_id === roomId);
      if (idx !== -1) {
        list[idx].lock_id = lockId || undefined;
        list[idx].lock_name = lockId ? `Khóa TTLock #${lockId}` : undefined;
        list[idx].lock_status = lockId ? 'online' : undefined;
        list[idx].battery_level = lockId ? 90 : undefined;
        saveSimRooms(list);
      }
      return { success: true, message: 'Đã gán khóa thành công!' };
    }
  },

  getAvailableLocks: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/rooms/available-locks', getHeaders(role));
      return res.data as LockItem[];
    } catch {
      return [
        { id: 10, lock_name: 'Khóa cửa thông minh T-10', lock_status: 'online', battery_level: 95 },
        { id: 11, lock_name: 'Khóa cửa thông minh T-11', lock_status: 'online', battery_level: 88 },
      ] as LockItem[];
    }
  },

  // ============================================================
  // KHÁCH HÀNG (CUSTOMERS)
  // ============================================================
  createCustomer: async (data: { full_name: string; email: string; phone?: string }, role: StaffRole) => {
    try {
      const res = await api.post('/admin/customers', data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimCustomers();
      const newId = list.length > 0 ? Math.max(...list.map(c => c.id)) + 1 : 1;
      const newCust: AdminCustomerItem = {
        id: newId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        is_blocked: 0,
        is_hidden: 0,
        account_type: 'GUEST_UNACTIVATED',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        total_bookings_count: 0,
        bookings: [],
      };
      list.unshift(newCust);
      saveSimCustomers(list);
      return { success: true, id: newId, message: 'Thêm khách hàng thành công!' };
    }
  },

  updateCustomer: async (id: number, data: any, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/customers/${id}`, data, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimCustomers();
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        saveSimCustomers(list);
      }
      return { success: true, message: 'Cập nhật thông tin khách hàng thành công!' };
    }
  },

  toggleHideCustomer: async (id: number, isHidden: boolean, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/customers/${id}/toggle-hide`, { is_hidden: isHidden }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimCustomers();
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx].is_hidden = isHidden ? 1 : 0;
        saveSimCustomers(list);
      }
      return { success: true, message: `Đã ${isHidden ? 'ẩn' : 'hiển thị'} khách hàng thành công!` };
    }
  },

  // 1. Quản lý Đơn (Hoàn chỉnh 4 tabs, bộ lọc, modal 4 bước, state machine)
  getBookings: async (params: {
    tab?: string;
    sub_status?: string;
    apartment_id?: number;
    booking_type?: string;
    check_in_from?: string;
    check_in_to?: string;
    room_type_id?: number;
    source?: string;
    is_waiting_info?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }, role: StaffRole) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.tab) queryParams.set('tab', params.tab);
      if (params.sub_status) queryParams.set('sub_status', params.sub_status);
      if (params.apartment_id) queryParams.set('apartment_id', String(params.apartment_id));
      if (params.booking_type) queryParams.set('booking_type', params.booking_type);
      if (params.check_in_from) queryParams.set('check_in_from', params.check_in_from);
      if (params.check_in_to) queryParams.set('check_in_to', params.check_in_to);
      if (params.room_type_id) queryParams.set('room_type_id', String(params.room_type_id));
      if (params.source) queryParams.set('source', params.source);
      if (params.is_waiting_info) queryParams.set('is_waiting_info', 'true');
      if (params.search) queryParams.set('search', params.search);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      const res = await api.get(`/admin/bookings?${queryParams.toString()}`, getHeaders(role));
      if (res.data) return res.data;
    } catch {}

    // Simulator Store fallback
    let list = getSimBookings();
    const tab = params.tab || 'all';
    if (tab === 'pending_payment') list = list.filter(b => b.booking_status === 'pending_payment');
    else if (tab === 'confirmed') list = list.filter(b => b.booking_status === 'confirmed');
    else if (tab === 'checked_in') list = list.filter(b => b.booking_status === 'checked_in');
    else if (tab === 'checked_out') list = list.filter(b => b.booking_status === 'checked_out');
    else if (tab === 'cancelled') list = list.filter(b => b.booking_status === 'cancelled');
    else list = list.filter(b => b.booking_status !== 'draft');

    if (params.search) {
      const s = params.search.trim().toLowerCase();
      list = list.filter(b =>
        b.booking_code.toLowerCase().includes(s) ||
        (b.customer_name || '').toLowerCase().includes(s) ||
        (b.customer_email || '').toLowerCase().includes(s) ||
        (b.customer_phone || '').includes(s)
      );
    }
    if (params.booking_type && params.booking_type !== 'all') {
      list = list.filter(b => b.booking_type === params.booking_type);
    }
    return list as any;
  },

  getBookingDetail: async (id: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/bookings/${id}`, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      return list.find(b => b.id === id) || list[0];
    }
  },

  calculateQuote: async (body: {
    apartment_id: number;
    room_type_id: number;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
    num_rooms?: number;
    booking_type?: string;
  }, role: StaffRole) => {
    try {
      const res = await api.post('/admin/bookings/calculate-quote', body, getHeaders(role));
      return res.data;
    } catch {
      // Tính giá offline
      const rts = getSimRoomTypes();
      const rt = rts.find(r => r.id === body.room_type_id) || rts[0];
      const basePrice = rt?.base_price || 850000;
      const numRooms = body.num_rooms || 1;
      const type = (body.booking_type || 'extended') as 'overnight' | 'daily' | 'extended';
      const multiplier = getPriceMultiplier(type);
      const checkIn = new Date(body.check_in);
      const checkOut = new Date(body.check_out);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
      const totalAmount = Math.round(basePrice * multiplier * numRooms * nights);
      const cfg = getStayTimes(type);
      return {
        base_price: basePrice,
        price_multiplier: multiplier,
        num_rooms: numRooms,
        nights,
        total_amount: totalAmount,
        stay_config: cfg,
        room_type_name: rt?.name || 'Loại phòng',
        max_occupancy: rt?.max_occupancy || 2,
      };
    }
  },

  manualHoldBooking: async (body: any, role: StaffRole) => {
    try {
      const res = await api.post('/admin/bookings/manual-hold', body, getHeaders(role));
      return res.data;
    } catch {
      // Tạo booking mới trong Simulator Store
      const list = getSimBookings();
      const newId = list.length > 0 ? Math.max(...list.map(b => b.id)) + 1 : 701;
      const code = genBookingCode();
      const type = (body.booking_type || 'extended') as 'overnight' | 'daily' | 'extended';
      const cfg = getStayTimes(type);
      const multiplier = getPriceMultiplier(type);
      const rts = getSimRoomTypes();
      const rt = rts.find(r => r.id === Number(body.room_type_id)) || rts[0];
      const numRooms = body.num_rooms || 1;
      const checkInDate = body.check_in || new Date().toISOString().slice(0, 10);
      const checkOutDate = body.check_out || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000));
      const totalAmount = Math.round((rt?.base_price || 850000) * multiplier * numRooms * nights);

      // Kiểm tra giờ check-in đã đến chưa
      const checkInHasArrived = isCheckInTimeReached(`${checkInDate}T00:00:00`, cfg.checkIn);
      const bookingStatus = checkInHasArrived ? 'checked_in' : 'confirmed';

      const newBooking: SimBookingItem = {
        id: newId,
        booking_code: code,
        booking_type: type,
        booking_status: bookingStatus as any,
        booked_start_time: `${checkInDate} ${cfg.checkIn}:00`,
        booked_end_time: `${checkOutDate} ${cfg.checkOut}:00`,
        check_in_actual: checkInHasArrived ? new Date().toISOString() : undefined,
        adults: body.adults || 1,
        children: body.children || 0,
        source: 'admin',
        total_amount: totalAmount,
        paid_amount: body.paid_amount || 0,
        customer_name: body.guest_name || '',
        customer_email: body.guest_email || '',
        customer_phone: body.guest_phone || '',
        customer_cccd: body.guest_cccd || '',
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        rooms: Array.from({ length: numRooms }, (_, i) => ({
          booking_room_id: newId * 10 + i,
          room_types_id: rt?.id || 1,
          room_id: body.room_ids?.[i] || null,
          room_type_name: rt?.name || 'Loại phòng',
          room_number: null,
          base_price: rt?.base_price || 850000,
        })),
        guests: body.guest_name ? [{
          id: newId * 10,
          name: body.guest_name,
          guest_type: 'adult',
          is_booker: true,
          is_staying: true,
          doc_type: 'cccd',
          doc_number: body.guest_cccd || '',
          doc_number_masked: body.guest_cccd ? `${body.guest_cccd.slice(0, 4)}****${body.guest_cccd.slice(-3)}` : '',
          status: 'confirmed',
        }] : [],
        transactions: [],
      };
      list.unshift(newBooking);
      saveSimBookings(list);
      return { success: true, id: newId, booking_code: code, booking_status: bookingStatus, total_amount: totalAmount };
    }
  },

  recordCounterPayment: async (id: number, body: { amount: number; payment_method: string; note?: string; room_ids?: number[] }, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/record-payment`, body, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        const booking = list[idx];
        const type = booking.booking_type;
        const cfg = getStayTimes(type);
        const checkInDate = booking.booked_start_time.slice(0, 10);
        const checkInHasArrived = isCheckInTimeReached(`${checkInDate}T00:00:00`, cfg.checkIn);

        list[idx].paid_amount = body.amount;
        list[idx].booking_status = checkInHasArrived ? 'checked_in' : 'confirmed';
        if (checkInHasArrived) list[idx].check_in_actual = new Date().toISOString();
        list[idx].transactions = [...(list[idx].transactions || []), {
          id: Date.now(),
          type: 'payment',
          amount: body.amount,
          created_at: new Date().toISOString(),
          note: body.note,
        }];

        // Gán room_id cụ thể nếu có
        if (body.room_ids && list[idx].rooms) {
          const rooms = getSimRooms();
          list[idx].rooms = list[idx].rooms!.map((r, i) => {
            const roomId = body.room_ids![i];
            const room = rooms.find(rm => rm.room_id === roomId);
            const roomIdx = rooms.findIndex(rm => rm.room_id === roomId);
            if (room && roomIdx !== -1) {
              rooms[roomIdx].status = checkInHasArrived ? 'occupied' : 'available';
              saveSimRooms(rooms);
            }
            return { ...r, room_id: roomId || null, room_number: room?.room_number || null, concrete_room_status: checkInHasArrived ? 'occupied' : 'available' };
          });
        }
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã ghi nhận thanh toán thành công!' };
    }
  },

  fillGuestInfo: async (id: number, guests: any[], role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/fill-guests`, { guests }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].guests = guests;
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã cập nhật thông tin khách!' };
    }
  },

  editBooking: async (id: number, body: any, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/bookings/${id}`, body, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...body };
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã cập nhật đơn thành công!' };
    }
  },

  cancelBooking: async (id: number, reason: string, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/cancel`, { reason }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        // Trả phòng về available nếu đang occupied
        if (list[idx].rooms) {
          const rooms = getSimRooms();
          list[idx].rooms!.forEach(r => {
            if (r.room_id) {
              const rIdx = rooms.findIndex(rm => rm.room_id === r.room_id);
              if (rIdx !== -1 && rooms[rIdx].status === 'occupied') {
                rooms[rIdx].status = 'cleaning';
              }
            }
          });
          saveSimRooms(rooms);
        }
        list[idx].booking_status = 'cancelled';
        list[idx].cancel_reason = reason;
        list[idx].cancelled_at = new Date().toISOString();
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã hủy đơn thành công!' };
    }
  },

  cancelUnpaidBooking: async (id: number, reason: string, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/cancel-unpaid`, { reason }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].booking_status = 'cancelled';
        list[idx].cancel_reason = reason;
        list[idx].cancelled_at = new Date().toISOString();
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã hủy giữ chỗ thành công!' };
    }
  },

  extendHoldTime: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/extend-hold`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        const currentExpiry = list[idx].hold_expires_at ? new Date(list[idx].hold_expires_at!) : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + 15 * 60 * 1000);
        list[idx].hold_expires_at = newExpiry.toISOString();
        list[idx].hold_remaining_seconds = Math.floor((newExpiry.getTime() - Date.now()) / 1000);
        list[idx].is_hold_expired = false;
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã gia hạn giữ chỗ thêm 15 phút!' };
    }
  },

  checkInBooking: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/check-in`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].booking_status = 'checked_in';
        list[idx].check_in_actual = new Date().toISOString();
        // Phòng → occupied
        const rooms = getSimRooms();
        list[idx].rooms?.forEach(r => {
          if (r.room_id) {
            const rIdx = rooms.findIndex(rm => rm.room_id === r.room_id);
            if (rIdx !== -1) rooms[rIdx].status = 'occupied';
          }
        });
        saveSimRooms(rooms);
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã check-in thành công!' };
    }
  },

  checkOutBooking: async (id: number, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/check-out`, {}, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].booking_status = 'checked_out';
        list[idx].check_out_actual = new Date().toISOString();
        // Phòng → cleaning
        const rooms = getSimRooms();
        list[idx].rooms?.forEach(r => {
          if (r.room_id) {
            const rIdx = rooms.findIndex(rm => rm.room_id === r.room_id);
            if (rIdx !== -1) rooms[rIdx].status = 'cleaning';
          }
        });
        saveSimRooms(rooms);
        saveSimBookings(list);
      }
      return { success: true, message: 'Đã check-out thành công!' };
    }
  },

  cancelPaidBookingAndRefund: async (id: number, refundAmount: number, reason: string, role: StaffRole) => {
    try {
      const res = await api.post(`/admin/bookings/${id}/cancel-paid-refund`, { refund_amount: refundAmount, reason }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimBookings();
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        list[idx].booking_status = 'cancelled';
        list[idx].cancel_reason = reason;
        list[idx].cancelled_at = new Date().toISOString();
        list[idx].refund_amount = refundAmount;
        list[idx].transactions = [...(list[idx].transactions || []), {
          id: Date.now(),
          type: 'refund',
          amount: refundAmount,
          created_at: new Date().toISOString(),
          note: reason,
        }];
        saveSimBookings(list);
      }
      return { success: true, message: `Đã ghi nhận hoàn tiền ${refundAmount.toLocaleString('vi-VN')}đ!` };
    }
  },

  getBookingGuestSignedDocUrl: async (bookingId: number, guestId: number, side: 'front' | 'back', role: StaffRole) => {
    try {
      const res = await api.get(`/admin/bookings/${bookingId}/guests/${guestId}/doc-image?side=${side}`, getHeaders(role));
      return res.data;
    } catch {
      return { signed_url: `https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80&_mock=${guestId}_${side}` };
    }
  },

  getRealtimeAlerts: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/bookings/realtime-alerts', getHeaders(role));
      return res.data;
    } catch {
      return { new_pending_bookings: [], near_expiry_holds: [] };
    }
  },

  // 2. Gán phòng & Bảo trì
  setRoomMaintenance: async (roomId: number, role: StaffRole) => {
    const res = await api.put(`/admin/rooms/${roomId}/maintenance`, {}, getHeaders(role));
    return res.data;
  },

  getEmergencyAlerts: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/rooms/emergency-alerts', getHeaders(role));
      return res.data;
    } catch {
      return mockAlerts;
    }
  },

  dismissEmergencyAlert: async (alertId: string, role: StaffRole) => {
    const res = await api.post(`/admin/rooms/emergency-alerts/${alertId}/dismiss`, {}, getHeaders(role));
    return res.data;
  },

  // 3. Duyệt giấy tờ
  getVerificationQueue: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/verification/queue', getHeaders(role));
      return res.data;
    } catch {
      return mockVerificationQueue;
    }
  },

  reviewGuestDocument: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/verification/review', data, getHeaders(role));
    return res.data;
  },

  getUnmaskedGuestDoc: async (guestId: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/verification/guest/${guestId}/unmasked`, getHeaders(role));
      return res.data;
    } catch {
      return { id: guestId, doc_number: '079198004561' };
    }
  },

  getSignedDocUrl: async (guestId: number, type: 'front' | 'back', rawUrl: string, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/verification/guest/${guestId}/signed-doc-url?type=${type}&url=${encodeURIComponent(rawUrl)}`, getHeaders(role));
      return res.data.signed_url;
    } catch {
      return `${rawUrl}?signed_token=mock_sec_${Date.now()}&expires=${Date.now() + 300000}`;
    }
  },

  // 4. Vòng đời dữ liệu
  getRetentionDashboard: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/retention/dashboard', getHeaders(role));
      return res.data;
    } catch {
      return mockRetentionStats;
    }
  },

  runPhotoCleanupJob: async (role: StaffRole) => {
    const res = await api.post('/admin/retention/run-photo-cleanup', {}, getHeaders(role));
    return res.data;
  },

  runAnonymizationJob: async (role: StaffRole) => {
    const res = await api.post('/admin/retention/run-anonymization', {}, getHeaders(role));
    return res.data;
  },

  updateRetentionConfig: async (config: any, role: StaffRole) => {
    const res = await api.put('/admin/retention/config', config, getHeaders(role));
    return res.data;
  },

  // 5. Khách hàng
  getCustomers: async (search: string, type: string, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/customers?search=${encodeURIComponent(search || '')}&type=${type || 'all'}`, getHeaders(role));
      if (res.data) return res.data;
    } catch {}
    let list = getSimCustomers();
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.full_name && c.full_name.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.phone && c.phone.includes(s))
      );
    }
    return list;
  },

  getCustomerHistory: async (id: number, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/customers/${id}/history`, getHeaders(role));
      if (res.data) return res.data;
    } catch {}
    const list = getSimCustomers();
    const c = list.find(item => item.id === id) || list[0];
    return {
      customer: c,
      bookings: c?.bookings || [
        {
          booking_code: 'BK-202611-101',
          apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
          room_type_names: 'Sunset Penthouse & Jacuzzi 270°',
          room_numbers: 'P101',
          booked_start_time: '2026-11-20 14:00:00',
          booked_end_time: '2026-11-22 12:00:00',
          total_amount: 3780000,
          booking_status: 'confirmed',
        }
      ],
    };
  },

  toggleBlockCustomer: async (id: number, block: boolean, reason: string, role: StaffRole) => {
    try {
      const res = await api.put(`/admin/customers/${id}/block`, { block, reason }, getHeaders(role));
      return res.data;
    } catch {
      const list = getSimCustomers();
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx].is_blocked = block ? 1 : 0;
        saveSimCustomers(list);
      }
      return { success: true, message: `Đã ${block ? 'khóa' : 'mở khóa'} tài khoản khách hàng thành công!` };
    }
  },

  mergeAccounts: async (masterId: number, duplicateId: number, role: StaffRole) => {
    const res = await api.post('/admin/customers/merge', { master_id: masterId, duplicate_id: duplicateId }, getHeaders(role));
    return res.data;
  },

  resendActivationInvite: async (id: number, role: StaffRole) => {
    const res = await api.post(`/admin/customers/${id}/resend-invite`, {}, getHeaders(role));
    return res.data;
  },

  // 6. Mã khóa
  getLockPins: async (status: string, search: string, role: StaffRole) => {
    try {
      const res = await api.get(`/admin/locks/pins?status=${status || ''}&search=${encodeURIComponent(search || '')}`, getHeaders(role));
      return res.data;
    } catch {
      return mockLockPins;
    }
  },

  issueOrRegeneratePin: async (bookingId: number, lockId: number, role: StaffRole) => {
    const res = await api.post('/admin/locks/pins/issue', { booking_id: bookingId, lock_id: lockId }, getHeaders(role));
    return res.data;
  },

  revokePin: async (bookingId: number, reason: string, role: StaffRole) => {
    const res = await api.post('/admin/locks/pins/revoke', { booking_id: bookingId, reason }, getHeaders(role));
    return res.data;
  },

  resendPinEmail: async (bookingId: number, role: StaffRole) => {
    const res = await api.post('/admin/locks/pins/resend-email', { booking_id: bookingId }, getHeaders(role));
    return res.data;
  },

  // 7. Danh mục & Staff & Audit Logs
  getRoomTypes: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/catalog/room-types', getHeaders(role));
      return res.data;
    } catch {
      return mockRoomTypes;
    }
  },

  saveRoomType: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/catalog/room-types', data, getHeaders(role));
    return res.data;
  },

  getPrices: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/catalog/prices', getHeaders(role));
      return res.data;
    } catch {
      return mockPrices;
    }
  },

  savePrice: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/catalog/prices', data, getHeaders(role));
    return res.data;
  },

  getExtraFees: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/catalog/extra-fees', getHeaders(role));
      return res.data;
    } catch {
      return mockExtraFees;
    }
  },

  saveExtraFee: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/catalog/extra-fees', data, getHeaders(role));
    return res.data;
  },

  getVouchers: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/catalog/vouchers', getHeaders(role));
      return res.data;
    } catch {
      return mockVouchers;
    }
  },

  saveVoucher: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/catalog/vouchers', data, getHeaders(role));
    return res.data;
  },

  getServices: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/catalog/services', getHeaders(role));
      return res.data;
    } catch {
      return mockServices;
    }
  },

  saveService: async (data: any, role: StaffRole) => {
    const res = await api.post('/admin/catalog/services', data, getHeaders(role));
    return res.data;
  },

  getStaffList: async (role: StaffRole) => {
    try {
      const res = await api.get('/admin/staff', getHeaders(role));
      return res.data;
    } catch {
      return mockStaff;
    }
  },

  updateStaff: async (id: number, data: any, role: StaffRole) => {
    const res = await api.put(`/admin/staff/${id}`, data, getHeaders(role));
    return res.data;
  },

  getAuditLogs: async (filters: any, role: StaffRole) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/admin/audit-logs?${params}`, getHeaders(role));
      return res.data;
    } catch {
      return mockAuditLogs;
    }
  },
};

// ============================================================
// DỮ LIỆU GIẢ LẬP FALLBACK KHI SERVER CHƯA BẬT
// ============================================================
const getMockBookings = (tab: string, role: StaffRole): AdminBookingItem[] => {
  const mask = (num: string) => role === 'admin' ? num : `${num.substring(0, 4)}****${num.substring(num.length - 3)}`;

  if (tab === 'pending_payment') {
    return [
      {
        id: 101,
        booking_code: 'BK-202611-101',
        booking_type: 'overnight',
        booking_status: 'pending_payment',
        booked_start_time: '2026-11-20 14:00:00',
        booked_end_time: '2026-11-21 12:00:00',
        hold_expires_at: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
        hold_remaining_seconds: 18 * 60,
        is_hold_expired: false,
        adults: 2,
        children: 1,
        customer_name: 'Nguyễn Nhật Huy',
        customer_email: 'huy.nguyen@example.com',
        customer_phone: '0901234567',
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        rooms: [
          {
            booking_room_id: 1,
            room_types_id: 1,
            room_id: null, // CHƯA THANH TOÁN THÌ ROOM_ID = NULL
            room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
            room_number: null,
            base_price: 1890000,
          },
        ],
        guests: [
          {
            id: 1,
            name: 'Nguyễn Nhật Huy',
            date_of_birth: '1995-08-20',
            guest_type: 'adult',
            is_booker: true,
            is_staying: true,
            doc_type: 'cccd',
            doc_number: mask('079195001234'),
            doc_number_masked: '0791****234',
            status: 'confirmed',
          },
          {
            id: 2,
            name: 'Trần Thị Mai',
            date_of_birth: '1998-03-15',
            guest_type: 'adult',
            is_booker: false,
            is_staying: true,
            doc_type: 'cccd',
            doc_number: mask('079198008899'),
            doc_number_masked: '0791****899',
            status: 'confirmed',
          },
          {
            id: 3,
            name: 'Nguyễn Minh Khang',
            date_of_birth: '2019-06-10',
            guest_type: 'child',
            is_booker: false,
            is_staying: true,
            doc_type: 'birth_cert',
            doc_number: mask('KS123456'),
            doc_number_masked: 'KS12****456',
            status: 'manual_child',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 202,
      booking_code: 'BK-202611-202',
      booking_type: 'daily',
      booking_status: 'confirmed',
      booked_start_time: '2026-11-22 14:00:00',
      booked_end_time: '2026-11-24 12:00:00',
      adults: 2,
      children: 0,
      customer_name: 'Lê Hoàng Nam',
      customer_email: 'nam.le@example.com',
      customer_phone: '0912345678',
      verification_status: 'passed',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      rooms: [
        {
          booking_room_id: 2,
          room_types_id: 2,
          room_id: 3,
          room_type_name: 'Sea View Balcony Room',
          room_number: 'P203',
          base_price: 850000,
          concrete_room_status: 'available',
        },
      ],
      guests: [
        {
          id: 4,
          name: 'Lê Hoàng Nam',
          doc_type: 'cccd',
          doc_number: mask('034200001234'),
          doc_number_masked: '0342****234',
          status: 'confirmed',
          guest_type: 'adult',
          is_booker: true,
          is_staying: true,
        },
      ],
    },
  ];
};

const getMockBookingDetail = (id: number, role: StaffRole) => {
  const bookings = getMockBookings('pending_payment', role);
  return bookings[0] || bookings;
};

const mockAlerts: EmergencyAlertItem[] = [
  {
    id: 'ALERT-01',
    booking_id: 202,
    booking_code: 'BK-202611-202',
    room_types_id: 2,
    previous_room_id: 3,
    reason: 'Phòng P203 bảo trì đột xuất, hệ thống đã cố gắng gán lại nhưng loại phòng Sea View Balcony Room đã hết sạch phòng trống.',
    created_at: new Date().toISOString(),
    severity: 'URGENT',
  },
];

const mockVerificationQueue: VerificationQueueItem[] = [
  {
    guest_id: 10,
    name: 'Phạm Quỳnh Anh',
    date_of_birth: '1992-11-04',
    doc_type: 'cccd',
    doc_number: '079192004561',
    doc_image_front: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    ocr_confidence: 62,
    guest_doc_status: 'ocr_low_confidence',
    booking_id: 301,
    booking_code: 'BK-202611-301',
    verification_status: 'manual_review',
    booked_start_time: '2026-11-25 14:00:00',
    booked_end_time: '2026-11-26 12:00:00',
    created_at: new Date().toISOString(),
  },
];

const mockCustomers: AdminCustomerItem[] = [
  {
    id: 1,
    full_name: 'Nguyễn Nhật Huy',
    email: 'huy.nguyen@example.com',
    phone: '0901234567',
    is_blocked: 0,
    account_type: 'REGISTERED',
    created_at: '2026-10-01 10:00:00',
    total_bookings_count: 3,
  },
  {
    id: 2,
    full_name: 'Khách vãng lai Đặt phòng',
    email: 'guest.order@example.com',
    phone: '0988776655',
    is_blocked: 0,
    account_type: 'GUEST_UNACTIVATED',
    created_at: '2026-11-02 15:30:00',
    total_bookings_count: 1,
  },
];

const mockLockPins: AdminLockPinItem[] = [
  {
    id: 1,
    booking_id: 202,
    lock_id: 1,
    pin: '849201',
    lock_pin_start_time: '2026-11-22 14:00:00',
    lock_pin_end_time: '2026-11-24 12:00:00',
    pin_status: 'sent',
    booking_code: 'BK-202611-202',
    booking_status: 'confirmed',
    verification_status: 'passed',
    customer_name: 'Lê Hoàng Nam',
    customer_email: 'nam.le@example.com',
    room_number: 'P203',
    lock_name: 'Smart Lock P203',
  },
];

const mockRetentionStats: RetentionStatsResponse = {
  stats: {
    deleted_photos_count: 34,
    pending_photo_deletions_count: 3,
    anonymized_guests_count: 18,
    upcoming_anonymization_count: 2,
    retention_config: {
      photoDeleteGraceDaysAfterCheckout: 0,
      dataAnonymizeMonthsAfterCheckout: 36,
    },
  },
  execution_logs: [
    {
      id: 'JOB-01',
      job_type: 'PHOTO_CLEANUP',
      executed_at: '2026-11-03 14:00:00',
      records_processed: 2,
      status: 'SUCCESS',
      details: 'Đã xóa an toàn ảnh CCCD của các đơn đã check-out.',
    },
    {
      id: 'JOB-02',
      job_type: 'ANONYMIZATION',
      executed_at: '2026-11-03 02:00:00',
      records_processed: 0,
      status: 'SUCCESS',
      details: 'Không có bản ghi nào quá 36 tháng cần ẩn danh hôm nay.',
    },
  ],
};

const mockRoomTypes = [
  { id: 1, name: 'Sunset Penthouse & Jacuzzi 270°', max_occupancy: 3, base_price: 1890000, bed_config: '1 Queen Bed + Sofa Bed' },
  { id: 2, name: 'Sea View Balcony Room', max_occupancy: 2, base_price: 850000, bed_config: '1 King/Queen' },
  { id: 3, name: 'The Cotton Cloud Suite', max_occupancy: 2, base_price: 920000, bed_config: '1 Giường King' },
  { id: 4, name: 'The Family Attic & Terrace', max_occupancy: 6, base_price: 1250000, bed_config: '2 Phòng ngủ' },
];

const mockPrices = [
  { id: 1, price_type: 'base', amount: 850000, price_modifier_type: 'fixed', valid_from: '2026-01-01', valid_to: '2026-12-31', is_active: 1 },
];

const mockExtraFees = [
  { extra_fee_id: 1, name: 'Phụ thu cuối tuần (T6, T7)', type: 'weekend', percent: 15, status: 'active', days_of_week: '5,6' },
  { extra_fee_id: 2, name: 'Phụ thu ngày lễ', type: 'holiday', percent: 25, status: 'active', days_of_week: 'all' },
];

const mockVouchers = [
  { id: 1, code: 'BONGGON15', title: 'Giảm 15% khi đặt từ 2 đêm', discount_type: 'percentage', discount_value: 15, min_order_value: 1000000, is_active: 1 },
];

const mockServices = [
  { services_id: 1, name: 'BBQ sân vườn cao cấp', price: 250000, description: 'Bao gồm bếp nướng, than và dụng cụ BBQ', is_active: 1 },
  { services_id: 2, name: 'Trang trí phòng trăng mật lãng mạn', price: 400000, description: 'Hoa hồng, nến thơm và rượu vang', is_active: 1 },
];

const mockStaff = [
  { staff_id: 1, full_name: 'Quản trị viên Hệ thống (Admin)', email: 'admin@homestay.com', phone: '0909999001', role_id: 1, role_name: 'admin', is_blocked: 0 },
  { staff_id: 2, full_name: 'Quản lý Vận hành (Manager)', email: 'manager@homestay.com', phone: '0909999002', role_id: 2, role_name: 'manager', is_blocked: 0 },
];

const mockAuditLogs: AuditLogItem[] = [
  {
    id: 1,
    actor: 'admin@homestay.com',
    action: 'ADMIN_CANCEL_PAID_AND_REFUND',
    entity_type: 'BOOKINGS',
    entity_id: '105',
    old_value: '{"status":"confirmed"}',
    new_value: '{"status":"cancelled","refund_amount":1700000,"reason":"Khách đổi lịch khẩn cấp"}',
    created_at: '2026-11-03 14:15:20',
  },
  {
    id: 2,
    actor: 'manager@homestay.com',
    action: 'APPROVE_DOCUMENT',
    entity_type: 'BOOKINGS',
    entity_id: '301',
    new_value: '{"decision":"passed"}',
    created_at: '2026-11-03 14:20:00',
  },
  {
    id: 3,
    actor: 'manager@homestay.com',
    action: 'VIEW_UNMASKED_DOC_NUMBER',
    entity_type: 'booking_guests',
    entity_id: '10',
    new_value: '{"masked":"0791****561"}',
    created_at: '2026-11-03 14:19:30',
  },
];

// ============================================================
// MOCK DATA – CHI NHÁNH, LOẠI PHÒNG, PHÒNG
// ============================================================
const mockBranches: BranchItem[] = [
  {
    id: 1,
    name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    hotline: '0903123456',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    total_rooms: 8,
    available_rooms: 6,
    maintenance_rooms: 1,
    hidden_rooms: 1,
    active_future_bookings: 3,
  },
  {
    id: 2,
    name: 'Chi nhánh 2 – Bãi Trước / Núi Lớn',
    address: 'Đường Vi Ba, Phường 1, TP. Vũng Tàu',
    hotline: '0903789123',
    status: 'active',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    total_rooms: 6,
    available_rooms: 5,
    maintenance_rooms: 0,
    hidden_rooms: 1,
    active_future_bookings: 2,
  },
];

const mockAdminRoomTypes: RoomTypeItem[] = [
  {
    id: 1,
    name: 'Sunset Penthouse & Jacuzzi 270°',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    base_price: 1890000,
    max_occupancy: 4,
    description: 'Phòng penthouse tầng cao với jacuzzi ngoài trời và tầm nhìn 270 độ hướng biển.',
    bed_config: '1 giường King',
    area: 65,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    total_rooms: 2,
    active_rooms: 2,
    images: [{ id: 1, image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', sort_order: 1 }],
    amenities: [{ id: 1, name: 'Jacuzzi' }, { id: 2, name: 'Tầm nhìn biển' }],
  },
  {
    id: 2,
    name: 'Sea View Balcony Room',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    base_price: 850000,
    max_occupancy: 2,
    description: 'Phòng tiêu chuẩn view biển, ban công riêng.',
    bed_config: '1 giường đôi',
    area: 32,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    total_rooms: 4,
    active_rooms: 4,
    images: [],
    amenities: [{ id: 2, name: 'Tầm nhìn biển' }, { id: 3, name: 'Ban công' }],
  },
  {
    id: 3,
    name: 'Garden Bungalow',
    apartment_id: 2,
    apartment_name: 'Chi nhánh 2 – Bãi Trước / Núi Lớn',
    base_price: 650000,
    max_occupancy: 3,
    description: 'Bungalow gần sân vườn, yên tĩnh và thoáng mát.',
    bed_config: '1 giường đôi + 1 giường đơn',
    area: 40,
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    total_rooms: 3,
    active_rooms: 3,
    images: [],
    amenities: [{ id: 4, name: 'Sân vườn' }],
  },
];

const mockAdminRooms: RoomItem[] = [
  {
    room_id: 1,
    room_number: 'P101',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 1,
    room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
    status: 'available',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    lock_id: 1,
    lock_name: 'Khóa TTLock P101',
    lock_status: 'online',
    battery_level: 85,
    is_ready_for_booking: true,
  },
  {
    room_id: 2,
    room_number: 'P102',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 1,
    room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
    status: 'maintenance',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    lock_id: 2,
    lock_name: 'Khóa TTLock P102',
    lock_status: 'offline',
    battery_level: 12,
    is_ready_for_booking: false,
  },
  {
    room_id: 3,
    room_number: 'P201',
    apartment_id: 1,
    apartment_name: 'Chi nhánh 1 – Triền Núi Nhỏ',
    room_type_id: 2,
    room_type_name: 'Sea View Balcony Room',
    status: 'available',
    is_hidden: false,
    created_at: '2026-01-01T00:00:00Z',
    is_ready_for_booking: false,
  },
];

export const adminService = adminApi;

