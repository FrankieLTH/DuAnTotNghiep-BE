// ========================================================
// SHARED ADMIN BOOKING DATE FILTERS (ASIA/HO_CHI_MINH UTC+7)
// ========================================================

export type DateView = 'all' | 'today' | 'upcoming';
export type DateSub =
  | 'all'
  | 'checkin'
  | 'checkout'
  | 'staying'
  | 'tomorrow'
  | '7days'
  | '30days'
  | 'custom';

/**
 * Trả về chuỗi YYYY-MM-DD chuẩn theo múi giờ Việt Nam (UTC+7, Asia/Ho_Chi_Minh)
 */
export function getVietnamDateString(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  // Chuyển sang chuỗi theo múi giờ Asia/Ho_Chi_Minh
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(d); // YYYY-MM-DD
}

/**
 * Lấy ngày dạng Date tại 00:00:00 theo múi giờ VN
 */
export function getVietnamMidnight(date: Date | string | number = new Date()): Date {
  const dateStr = getVietnamDateString(date);
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/**
 * Kiểm tra một booking có khớp với bộ lọc ngày "Hôm nay / Sắp tới" hay không
 */
export function matchesDateFilter(
  booking: {
    booked_start_time?: string;
    booked_end_time?: string;
    start_at?: string;
    end_at?: string;
    booking_status?: string;
    apartment_id?: number;
  },
  view: DateView,
  sub: DateSub = 'all',
  customRange?: { from?: string; to?: string },
  now = new Date()
): boolean {
  if (view === 'all') return true;

  const rawStart = booking.start_at || booking.booked_start_time;
  const rawEnd = booking.end_at || booking.booked_end_time;
  if (!rawStart || !rawEnd) return false;

  const startDateVN = getVietnamDateString(rawStart);
  const endDateVN = getVietnamDateString(rawEnd);
  const todayVN = getVietnamDateString(now);

  const startMs = new Date(rawStart).getTime();
  const endMs = new Date(rawEnd).getTime();
  const nowMs = now.getTime();

  // 1. HÔM NAY
  if (view === 'today') {
    const isCheckinToday = startDateVN === todayVN;
    const isCheckoutToday = endDateVN === todayVN;
    // Đang ở: đã bắt đầu và chưa kết thúc (hoặc status checked_in)
    const isStayingToday =
      (startMs <= nowMs && endMs >= nowMs) ||
      (startDateVN <= todayVN && endDateVN >= todayVN) ||
      booking.booking_status === 'checked_in';

    if (sub === 'all') {
      return isCheckinToday || isCheckoutToday || isStayingToday;
    }
    if (sub === 'checkin') return isCheckinToday;
    if (sub === 'checkout') return isCheckoutToday;
    if (sub === 'staying') return isStayingToday;

    return isCheckinToday || isCheckoutToday || isStayingToday;
  }

  // 2. SẮP TỚI (start_at > now hoặc ngày checkin > today)
  if (view === 'upcoming') {
    // Chỉ tính các đơn có start_at sau hôm nay
    const isAfterToday = startDateVN > todayVN;
    if (!isAfterToday && startMs <= nowMs) {
      return false;
    }

    const todayDate = new Date(`${todayVN}T00:00:00+07:00`);
    const tomorrowDate = new Date(todayDate.getTime() + 86400000);
    const tomorrowVN = getVietnamDateString(tomorrowDate);

    if (sub === 'all') {
      return isAfterToday;
    }
    if (sub === 'tomorrow') {
      return startDateVN === tomorrowVN;
    }
    if (sub === '7days') {
      const in7DaysDate = new Date(todayDate.getTime() + 7 * 86400000);
      const in7DaysVN = getVietnamDateString(in7DaysDate);
      return startDateVN >= tomorrowVN && startDateVN <= in7DaysVN;
    }
    if (sub === '30days') {
      const in30DaysDate = new Date(todayDate.getTime() + 30 * 86400000);
      const in30DaysVN = getVietnamDateString(in30DaysDate);
      return startDateVN >= tomorrowVN && startDateVN <= in30DaysVN;
    }
    if (sub === 'custom') {
      if (!customRange?.from && !customRange?.to) return isAfterToday;
      const fromVN = customRange.from ? getVietnamDateString(customRange.from) : '';
      const toVN = customRange.to ? getVietnamDateString(customRange.to) : '';

      if (fromVN && startDateVN < fromVN) return false;
      if (toVN && startDateVN > toVN) return false;
      return true;
    }

    return isAfterToday;
  }

  return true;
}

/**
 * Tính số lượng badge cho "Hôm nay · n" và "Sắp tới · n"
 */
export function computeDateCounts(
  bookings: any[],
  apartmentId?: number,
  now = new Date()
): { today: number; upcoming: number } {
  let today = 0;
  let upcoming = 0;

  for (const b of bookings) {
    // Không tính các đơn đã hủy hoặc nháp hết hạn
    const status = b.booking_status || b.status;
    if (status === 'cancelled' || status === 'expired') continue;

    if (apartmentId && apartmentId > 0 && b.apartment_id && b.apartment_id !== apartmentId) {
      continue;
    }

    if (matchesDateFilter(b, 'today', 'all', undefined, now)) {
      today++;
    }
    if (matchesDateFilter(b, 'upcoming', 'all', undefined, now)) {
      upcoming++;
    }
  }

  return { today, upcoming };
}
