// ========================================================
// SHARED INTERFACES & DTO CONTRACTS (Monorepo Shared Folder)
// ========================================================

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
  Permission,
} from '../enums';

export * from '../enums';
export * from '../constants';
export * from '../helpers';

export interface IUser {
  id: number;
  role_id: number;
  role_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'blocked';
  created_at?: string;
}

export interface ICustomer {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  is_blocked: boolean;
  is_hidden: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IStaff {
  id: number;
  role_id: number;
  role_name?: StaffRole | string;
  apartment_id?: number | null;
  apartment_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  is_blocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IApartment {
  id: number;
  name: string;
  address: string;
  hotline?: string;
  status: ApartmentStatus | 'active' | 'hidden';
  created_at?: string;
  updated_at?: string;
}

export interface IRoomType {
  id: number;
  name: string;
  apartment_id: number;
  apartment_name?: string;
  base_price: number;
  max_occupancy: number;
  description?: string;
  bed_config?: string;
  area?: number;
  is_active: boolean;
  created_at?: string;
}

export interface IAmenity {
  id: number;
  name: string;
  category?: string;
}

export interface IRoomImage {
  id: number;
  room_id: number;
  image_url: string;
}

export interface IRoom {
  id: number;
  room_id?: number;
  apartment_id: number;
  apartment_name?: string;
  room_type_id: number;
  room_type_name?: string;
  room_number: string;
  status: RoomStatus | 'available' | 'maintenance';
  base_price?: number;
  max_occupancy?: number;
  last_maintenance_date?: string;
  is_hidden: boolean;
  images?: string[];
  amenities?: string[];
  lock?: ILock;
  created_at?: string;
  updated_at?: string;
}

export interface IService {
  id: number;
  name: string;
  description?: string;
  price: number;
  is_compensation: boolean;
  is_active: boolean;
}

export interface IVoucher {
  id: number;
  code: string;
  title?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value?: number;
  usage_limit?: number;
  used_count: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface IBookingGuest {
  id?: number;
  booking_id?: number;
  guest_type: GuestType | 'primary' | 'additional';
  is_staying: boolean;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  doc_type?: DocType | 'cccd' | 'passport' | 'birth_cert' | null;
  doc_number?: string | null;
  doc_number_masked?: string;
  doc_image_front?: string | null;
  doc_image_back?: string | null;
  ocr_confidence?: number | null;
  ocr_raw?: Record<string, any> | string | null;
  status: GuestSlotStatus | 'empty' | 'uploading' | 'ocr_done' | 'ocr_low_confidence' | 'manual_child' | 'confirmed';
  doc_deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IBookingRoom {
  id: number;
  bookings_id: number;
  room_types_id: number;
  room_types_name?: string;
  room_id?: number | null;
  room_number?: string | null;
}

export interface ITransaction {
  id: number;
  booking_id: number;
  type: TransactionType | 'payment' | 'refund';
  amount: number;
  payment_method?: string;
  transaction_code?: string;
  note?: string;
  created_by?: number | null;
  created_at: string;
}

export interface IAuditLog {
  id: number;
  actor: string;
  actor_id?: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

export interface IBooking {
  id: number;
  booking_code: string;
  apartment_id: number;
  apartment_name?: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  room_id?: number | null;
  room_number?: string | null;
  room_type_id?: number;
  room_type_name?: string;
  voucher_id?: number | null;
  voucher_code?: string;
  adults: number;
  children: number;
  is_booked_for_other: boolean;
  lock_email?: string | null;
  booking_type: BookingType | 'overnight' | 'daily';
  booked_start_time: string;
  booked_end_time: string;
  check_in_actual?: string | null;
  check_out_actual?: string | null;
  booking_status: BookingStatus | 'draft' | 'pending_payment' | 'confirmed' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled';
  verification_status: VerificationStatus | 'pending' | 'passed' | 'manual_review' | 'rejected';
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  consent_at?: string | null;
  stay_reason?: string | null;
  source: BookingSource | 'online' | 'admin';
  created_by?: number | null;
  creator_name?: string;
  note?: string | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: number | null;
  total_price: number;
  discount_amount: number;
  hold_expires_at?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;

  // Embedded relations
  guests?: IBookingGuest[];
  booking_rooms?: IBookingRoom[];
  transactions?: ITransaction[];
  lock_pin?: ILockPin | null;
}

export interface ILockPin {
  id: number;
  booking_id: number;
  lock_id: number;
  cloud_pw_id?: string;
  pin: string;
  lock_pin_start_time?: string;
  lock_pin_end_time?: string;
  status: string;
  created_at?: string;
}

export interface ILock {
  id: number;
  room_id?: number | null;
  room_number?: string;
  cloud_lock_id: string;
  lock_name?: string;
  lock_type: LockType | 'ttlock' | 'manual' | 'other';
  lock_status: LockStatus | 'online' | 'offline' | 'unknown';
  master_pin?: string;
  battery_level?: number;
  last_sync_at?: string;
  deleted_at?: string | null;
}

export interface IDashboardStats {
  revenue: {
    weekly: number;
    monthly: number;
    quarterly: number;
    yearly: number;
    total: number;
  };
  vacant_rooms_count: number;
  pending_refunds_count: number;
  weekly_bookings_count: number;
  upcoming_checkouts_count: number;
}
