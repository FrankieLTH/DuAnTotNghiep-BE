// ========================================================
// SHARED BUSINESS LOGIC HELPERS & UTILITIES
// ========================================================

import { BookingStatus, BookingType } from './enums';
import { CHILD_AGE_THRESHOLD } from './constants';

/**
 * Tính số tuổi dựa vào ngày sinh và ngày mốc (mặc định là ngày check-in)
 */
export function calculateAge(dob: string | Date, referenceDate: string | Date = new Date()): number {
  const birth = new Date(dob);
  const ref = new Date(referenceDate);

  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) {
    return 0;
  }

  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Kiểm tra xem người ở có phải là trẻ em dưới 10 tuổi tại thời điểm check-in hay không
 */
export function isChildUnder10(dob: string | Date, checkInDate: string | Date): boolean {
  return calculateAge(dob, checkInDate) < CHILD_AGE_THRESHOLD;
}

/**
 * Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái booking theo State Machine chuẩn
 * State Transitions:
 * - draft -> pending_payment | expired
 * - pending_payment -> confirmed | expired | cancelled
 * - confirmed -> checked_in | cancelled
 * - checked_in -> checked_out
 * - checked_out, expired, cancelled là trạng thái kết thúc (không thể chuyển tiếp)
 */
export function isValidStatusTransition(
  currentStatus: BookingStatus | string,
  newStatus: BookingStatus | string
): boolean {
  if (currentStatus === newStatus) {
    return true; // Cho phép giữ nguyên (idempotent)
  }

  const validTransitions: Record<string, string[]> = {
    [BookingStatus.DRAFT]: [BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED],
    [BookingStatus.PENDING_PAYMENT]: [BookingStatus.CONFIRMED, BookingStatus.EXPIRED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
    [BookingStatus.CHECKED_IN]: [BookingStatus.CHECKED_OUT],
    [BookingStatus.CHECKED_OUT]: [],
    [BookingStatus.EXPIRED]: [],
    [BookingStatus.CANCELLED]: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Che số giấy tờ tùy thân (CCCD / Passport) bảo vệ dữ liệu cá nhân theo mẫu: 0791****234
 */
export function maskDocumentNumber(docNumber?: string | null): string {
  if (!docNumber || typeof docNumber !== 'string') {
    return 'Chưa cung cấp';
  }

  const trimmed = docNumber.trim();
  if (trimmed.length < 7) {
    return '****';
  }

  const firstFour = trimmed.slice(0, 4);
  const lastThree = trimmed.slice(-3);
  return `${firstFour}****${lastThree}`;
}

/**
 * Tính số phòng trống của một loại phòng
 * Phòng trống = Tổng số phòng cụ thể khả dụng - Số đơn đang chiếm trùng thời gian
 */
export function calculateAvailableRooms(
  totalRoomsAvailableWithLock: number,
  occupiedOrHeldRoomsCount: number
): number {
  return Math.max(0, totalRoomsAvailableWithLock - occupiedOrHeldRoomsCount);
}

/**
 * Tính giá đặt phòng dựa trên số đêm và loại hình đặt phòng
 */
export function calculateBookingPrice(
  basePricePerNight: number,
  checkIn: string | Date,
  checkOut: string | Date,
  _bookingType: BookingType | string = BookingType.OVERNIGHT,
  discountAmount: number = 0
): { nights: number; rawTotal: number; discount: number; finalTotal: number } {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  // Tính số đêm (tối thiểu 1 đêm)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const rawTotal = basePricePerNight * nights;
  const safeDiscount = Math.min(rawTotal, Math.max(0, discountAmount || 0));
  const finalTotal = rawTotal - safeDiscount;

  return {
    nights,
    rawTotal,
    discount: safeDiscount,
    finalTotal,
  };
}
