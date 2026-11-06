// ========================================================
// SHARED SYSTEM CONSTANTS & BUSINESS RULES
// ========================================================

/** Giờ check-in cố định (14:00) — dùng cho loại extended */
export const STANDARD_CHECK_IN_TIME = '14:00';

/** Giờ check-out cố định (12:00) */
export const STANDARD_CHECK_OUT_TIME = '12:00';

/** Thời gian giữ chỗ mặc định khi khách bắt đầu điền thông tin: 30 phút */
export const HOLD_EXPIRATION_MINUTES = 30;

/** Thời gian gia hạn giữ chỗ thêm cho lễ tân/quản lý: 15 phút */
export const EXTENDED_HOLD_MINUTES = 15;

/** Ngưỡng tuổi trẻ em: dưới 10 tuổi tính theo ngày check-in */
export const CHILD_AGE_THRESHOLD = 10;

/** Thời gian hết hạn của Signed URL xem ảnh CCCD riêng tư: 120 giây (2 phút) */
export const SIGNED_DOC_URL_TTL_SECONDS = 120;

/** Thời hạn lưu trữ thông tin lưu trú khách hàng: 36 tháng kể từ lúc check-out */
export const STAY_DATA_RETENTION_MONTHS = 36;

/** Số ngày tối thiểu từ ngày hủy đến ngày check-in để được hoàn tiền */
export const REFUND_ELIGIBLE_DAYS_BEFORE_CHECKIN = 10;

/** Cấu hình 3 loại lưu trú: giờ check-in/out và hệ số giá */
export const STAY_TYPE_CONFIG = {
  overnight: {
    label: 'Qua đêm',
    description: '19:00 — 12:00 hôm sau',
    checkInTime: '19:00',
    checkOutTime: '12:00',
    priceMultiplier: 0.7,
  },
  daily: {
    label: 'Trong ngày',
    description: '07:00 — 17:00',
    checkInTime: '07:00',
    checkOutTime: '17:00',
    priceMultiplier: 0.7,
  },
  extended: {
    label: 'Qua ngày',
    description: '14:00 — 12:00 hôm sau',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    priceMultiplier: 1.0,
  },
} as const;

export type StayType = keyof typeof STAY_TYPE_CONFIG;

/** Các sự kiện realtime đồng bộ hệ thống (ID only payload) */
export const REALTIME_EVENTS = {
  BOOKING_UPDATED: 'booking.updated',
  AVAILABILITY_CHANGED: 'availability.changed',
  CATALOG_CHANGED: 'catalog.changed',
  CUSTOMER_UPDATED: 'customer.updated',
} as const;

export type RealtimeEventType = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
