import { bangkokDateString } from '../../common/utils/bangkok-date';

// Same-day arrivals remain bookable after the nominal check-in hour.
// The stored stay window is retained for room-overlap/capacity checks.
export function isStayBookableNow(start: Date, end: Date, now = new Date()): boolean {
  if (![start, end, now].every(d => Number.isFinite(d.getTime())) || end <= start || end <= now) return false;
  const localDate = (date: Date) => bangkokDateString(date);
  return localDate(start) >= localDate(now);
}
