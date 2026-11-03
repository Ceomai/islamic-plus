import type { PrayerCompletion } from '../types';
import { addDays, localDateKey } from '../utils/date';

/**
 * How far back prayer marks are kept. A count cap (it used to be 500, about 100 days) dropped the
 * oldest history on the device and, in a sync, the newest marks; a date window does neither.
 */
export const PRAYER_HISTORY_DAYS = 365 * 3;

/** Newest first, one entry per prayer and day, nothing older than the history window. */
export function trimPrayerHistory(list: PrayerCompletion[], today: Date = new Date()): PrayerCompletion[] {
  const cutoff = localDateKey(addDays(today, -PRAYER_HISTORY_DAYS));
  return list
    .filter((p) => p.date >= cutoff)
    .sort((x, y) => y.date.localeCompare(x.date) || y.completedAt.localeCompare(x.completedAt));
}

/** Union of two devices' marks; when both have the same prayer and day, the later mark wins. */
export function mergePrayerCompletions(a: PrayerCompletion[], b: PrayerCompletion[]): PrayerCompletion[] {
  const map = new Map<string, PrayerCompletion>();
  for (const item of [...a, ...b]) {
    const key = `${item.prayer}:${item.date}`;
    const existing = map.get(key);
    if (!existing || item.completedAt > existing.completedAt) map.set(key, item);
  }
  return trimPrayerHistory([...map.values()]);
}
