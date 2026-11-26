// Same-day arrivals remain bookable after the nominal check-in hour.
// The stored stay window is retained for room-overlap/capacity checks.
export function isStayBookableNow(start: Date, end: Date, now = new Date()): boolean {
  if (![start, end, now].every(d => Number.isFinite(d.getTime())) || end <= start || end <= now) return false;
  const localDate = (date: Date) => date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  return localDate(start) >= localDate(now);
}
