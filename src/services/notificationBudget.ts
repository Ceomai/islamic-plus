import type { CustomReminder } from '../types';

/**
 * iOS keeps at most 64 pending local notifications and silently drops the rest, so prayer
 * notifications and custom reminders share a budget below that limit.
 */
export const NOTIFICATION_BUDGET = 60;
/** Custom reminders may use at most this many slots; prayers always keep the rest */
export const MAX_CUSTOM_SLOTS = 30;
export const MAX_PRAYER_DAYS = 7;
/** One slot for the "open the app to keep notifications coming" notice at the end of the window */
const REFRESH_NOTICE_SLOTS = 1;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Notifications one reminder needs: an every-day reminder is a single daily trigger. */
export function reminderSlots(r: CustomReminder): number {
  if (!r.enabled || !TIME_RE.test(r.time) || r.daysOfWeek.length === 0) return 0;
  return r.daysOfWeek.length >= 7 ? 1 : r.daysOfWeek.length;
}

/** Reminders that fit in the custom budget, in their saved order */
export function remindersWithinBudget(reminders: CustomReminder[]): CustomReminder[] {
  let used = 0;
  const out: CustomReminder[] = [];
  for (const r of reminders) {
    const slots = reminderSlots(r);
    if (slots === 0) continue;
    if (used + slots > MAX_CUSTOM_SLOTS) continue;
    used += slots;
    out.push(r);
  }
  return out;
}

export function customSlotsUsed(reminders: CustomReminder[]): number {
  return remindersWithinBudget(reminders).reduce((sum, r) => sum + reminderSlots(r), 0);
}

/** How many days of prayer notifications fit next to the custom reminders (1–7). */
export function prayerDaysAhead(reminders: CustomReminder[], prayersPerDay: number): number {
  if (prayersPerDay <= 0) return MAX_PRAYER_DAYS;
  const left = NOTIFICATION_BUDGET - REFRESH_NOTICE_SLOTS - customSlotsUsed(reminders);
  return Math.max(1, Math.min(MAX_PRAYER_DAYS, Math.floor(left / prayersPerDay)));
}
