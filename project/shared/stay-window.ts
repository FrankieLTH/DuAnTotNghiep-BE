export const STAY_TYPE_FACTORS: Record<string, { factor: number; checkIn: string; checkOut: string; name: string }> = {
  overnight: { factor: 0.7, checkIn: '19:00', checkOut: '12:00', name: 'Qua đêm' },
  daytime: { factor: 0.7, checkIn: '07:00', checkOut: '17:00', name: 'Trong ngày' },
  daily: { factor: 0.7, checkIn: '07:00', checkOut: '17:00', name: 'Trong ngày' },
  fullday: { factor: 1.0, checkIn: '14:00', checkOut: '12:00', name: 'Qua ngày' },
  extended: { factor: 1.0, checkIn: '14:00', checkOut: '12:00', name: 'Qua ngày' },
};

/**
 * Tính toán khung giờ lưu trú chính xác theo loại hình và ngày check-in/out
 */
export function computeStayWindow(
  checkIn: string,
  checkOut: string,
  stayType: string,
  stayConfig = STAY_TYPE_FACTORS
): {
  startAt: string;
  endAt: string;
  nightsOrDays: number;
  priceFactor: number;
  name: string;
} {
  const normType = (stayType || 'overnight').toLowerCase();
  const cfg = stayConfig[normType] || STAY_TYPE_FACTORS.overnight;

  const inDate = checkIn ? checkIn.split('T')[0] : new Date().toISOString().split('T')[0];
  let outDate = checkOut ? checkOut.split('T')[0] : inDate;

  let nightsOrDays = 1;
  const startAt = `${inDate}T${cfg.checkIn}:00`;

  if (normType === 'daytime' || normType === 'daily') {
    // Trong ngày: nhận và trả trong cùng ngày
    const endAt = `${inDate}T${cfg.checkOut}:00`;
    return {
      startAt,
      endAt,
      nightsOrDays: 1,
      priceFactor: cfg.factor,
      name: cfg.name,
    };
  }

  // Overnight / Fullday
  const sDate = new Date(inDate);
  const eDate = new Date(outDate);
  const diffDays = Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
  nightsOrDays = diffDays;

  // Nếu outDate trùng inDate, tự cộng thêm 1 ngày
  if (outDate <= inDate) {
    const nextDay = new Date(sDate.getTime() + 86400000);
    outDate = nextDay.toISOString().split('T')[0];
    nightsOrDays = 1;
  }

  const endAt = `${outDate}T${cfg.checkOut}:00`;

  return {
    startAt,
    endAt,
    nightsOrDays,
    priceFactor: cfg.factor,
    name: cfg.name,
  };
}
