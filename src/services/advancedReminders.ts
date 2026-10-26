import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translate } from '../i18n';
import type { AppLanguage, CustomReminder } from '../types';
import { remindersWithinBudget } from './notificationBudget';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "8:5", "08.30", "830" → "08:05" / "08:30"; null when it can't be a time of day. */
export function normalizeReminderTime(input: string): string | null {
  const digits = input.trim().replace(/[.,\s]/g, ':');
  const m = digits.match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const value = `${m[1].padStart(2, '0')}:${m[2]}`;
  return TIME_RE.test(value) ? value : null;
}

export async function scheduleCustomReminders(reminders: CustomReminder[], lang: AppLanguage = 'en'): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('custom-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // remindersWithinBudget also skips disabled ones and times saved before validation existed
  for (const r of remindersWithinBudget(reminders)) {
    const [hour, minute] = r.time.split(':').map(Number);
    const content = {
      title: r.title,
      body: translate(lang, `reminders.body.${r.type}`),
      sound: r.sound === 'silent' ? undefined : 'default',
    };
    // Every day: one daily trigger instead of seven weekly ones
    if (r.daysOfWeek.length >= 7) {
      await Notifications.scheduleNotificationAsync({
        identifier: `custom-${r.id}-daily`,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      continue;
    }
    for (const day of r.daysOfWeek) {
      await Notifications.scheduleNotificationAsync({
        identifier: `custom-${r.id}-${day}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1, // 1 = Sunday (matches getDay() 0 = Sunday)
          hour,
          minute,
        },
      });
    }
  }
}
