import { DUAS } from '../data/duas';

const DAY_MS = 86_400_000;

/**
 * Day of the year (1 for 1 January) of the local calendar date. Built from UTC date parts, so a
 * 23- or 25-hour day around a daylight-saving change does not shift the count by one.
 */
export function dayOfYear(date: Date): number {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const yearStart = Date.UTC(date.getFullYear(), 0, 0);
  return Math.round((day - yearStart) / DAY_MS);
}

/** The item for a local day, the same all day and rotating through `items` day by day. */
export function pickForDay<T>(date: Date, items: readonly T[]): T | undefined {
  return items[dayOfYear(date) % items.length];
}

/** Same dua for the whole local day, rotating through the collection. */
export function duaOfTheDay(date: Date) {
  return pickForDay(date, DUAS);
}
