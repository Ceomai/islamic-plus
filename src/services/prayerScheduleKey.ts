import type { UserSettings } from '../types';
import { reminderSlots } from './notificationBudget';

/** ~100 m: closer moves don't change prayer times by a minute */
const COORD_DECIMALS = 3;

const round = (n: number) => Number(n.toFixed(COORD_DECIMALS));

/**
 * Everything the scheduled prayer notifications depend on. Rescheduling follows changes of this
 * key only: theme, font or sync bookkeeping changes used to cancel and set all of them again.
 */
export function prayerScheduleKey(settings: UserSettings, location: { latitude: number; longitude: number }): string {
  return JSON.stringify([
    round(location.latitude),
    round(location.longitude),
    settings.globalNotificationsEnabled,
    settings.prayerNotifications,
    settings.disabledPrayerRules,
    settings.calculationMethod,
    settings.madhab,
    settings.appLanguage,
    // Custom reminders only matter through the slots they take from the notification budget
    (settings.customReminders ?? []).map(reminderSlots),
  ]);
}
