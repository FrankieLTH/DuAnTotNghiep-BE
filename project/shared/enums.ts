// ========================================================
// SHARED ENUMS & UNIFIED DOMAIN TYPES
// ========================================================

export enum BookingStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum BookingType {
  OVERNIGHT = 'overnight',
  DAILY = 'daily',
  EXTENDED = 'extended',
}

export enum VerificationStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  MANUAL_REVIEW = 'manual_review',
  REJECTED = 'rejected',
}

export enum BookingSource {
  ONLINE = 'online',
  ADMIN = 'admin',
}

export enum GuestType {
  PRIMARY = 'primary',
  ADDITIONAL = 'additional',
}

export enum DocType {
  CCCD = 'cccd',
  PASSPORT = 'passport',
  BIRTH_CERT = 'birth_cert',
}

export enum GuestSlotStatus {
  EMPTY = 'empty',
  UPLOADING = 'uploading',
  OCR_DONE = 'ocr_done',
  OCR_LOW_CONFIDENCE = 'ocr_low_confidence',
  MANUAL_CHILD = 'manual_child',
  CONFIRMED = 'confirmed',
}

export enum ApartmentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
}

export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
}

export enum LockStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export enum LockType {
  TTLOCK = 'ttlock',
  MANUAL = 'manual',
  OTHER = 'other',
}

export enum StaffRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
}

export enum Permission {
  VIEW_BOOKINGS = 'view_bookings',
  CREATE_MANUAL_BOOKING = 'create_manual_booking',
  EDIT_BOOKING = 'edit_booking',
  EXTEND_HOLD = 'extend_hold',
  CANCEL_PENDING_BOOKING = 'cancel_pending_booking',
  CHECKIN_CHECKOUT = 'checkin_checkout',
  RECORD_COUNTER_PAYMENT = 'record_counter_payment',
  CANCEL_CONFIRMED_BOOKING = 'cancel_confirmed_booking',
  VIEW_DOCUMENT_IMAGE = 'view_document_image',
  VIEW_FULL_DOCUMENT_NUMBER = 'view_full_document_number',
  MANAGE_BRANCHES = 'manage_branches',
  MANAGE_ROOMS = 'manage_rooms',
  MANAGE_CUSTOMERS = 'manage_customers',
}

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  [StaffRole.ADMIN]: [
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_MANUAL_BOOKING,
    Permission.EDIT_BOOKING,
    Permission.EXTEND_HOLD,
    Permission.CANCEL_PENDING_BOOKING,
    Permission.CHECKIN_CHECKOUT,
    Permission.RECORD_COUNTER_PAYMENT,
    Permission.CANCEL_CONFIRMED_BOOKING,
    Permission.VIEW_DOCUMENT_IMAGE,
    Permission.VIEW_FULL_DOCUMENT_NUMBER,
    Permission.MANAGE_BRANCHES,
    Permission.MANAGE_ROOMS,
    Permission.MANAGE_CUSTOMERS,
  ],
  [StaffRole.MANAGER]: [
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_MANUAL_BOOKING,
    Permission.EDIT_BOOKING,
    Permission.EXTEND_HOLD,
    Permission.CANCEL_PENDING_BOOKING,
    Permission.CHECKIN_CHECKOUT,
    Permission.RECORD_COUNTER_PAYMENT,
    Permission.MANAGE_BRANCHES,
    Permission.MANAGE_ROOMS,
    Permission.MANAGE_CUSTOMERS,
    // Note: Manager DOES NOT have CANCEL_CONFIRMED_BOOKING, VIEW_DOCUMENT_IMAGE, VIEW_FULL_DOCUMENT_NUMBER
  ],
};
