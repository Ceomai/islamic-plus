/**
 * Calendar-day key (YYYY-MM-DD) in the device's local time zone.
 * `toISOString()` uses UTC, which puts anything done between local midnight and the UTC offset
 * (00:00–03:00 in Türkiye) on the previous day.
 */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local date `days` away from `date` (negative for the past). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Keys for the last `count` local days, oldest first, ending today. */
export function lastDayKeys(count: number, today: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => localDateKey(addDays(today, i - (count - 1))));
}
