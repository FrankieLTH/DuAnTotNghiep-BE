// Asia/Bangkok is a fixed UTC+7 offset (no DST), so date-only formatting can be
// done arithmetically. This deliberately avoids `toLocaleDateString('sv-SE')`:
// Node builds with small-icu (e.g. Alpine/Docker) fall back to en-US and return
// "M/D/YYYY" instead of "YYYY-MM-DD", which silently broke date comparisons.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Format a Date as YYYY-MM-DD in Asia/Bangkok without locale data. */
export function bangkokDateString(date: Date): string {
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string as Bangkok midnight. */
export function parseBangkokDate(value: string): Date {
  return new Date(`${value}T00:00:00+07:00`);
}

/** True only for a real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isBangkokDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseBangkokDate(value);
  return Number.isFinite(date.getTime()) && bangkokDateString(date) === value;
}
