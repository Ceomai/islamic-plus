import * as Notifications from 'expo-notifications';
import type { CustomReminder } from '../types';

export async function scheduleCustomReminders(reminders: CustomReminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('custom-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const r of reminders) {
    if (!r.enabled) continue;
    const [hour, minute] = r.time.split(':').map(Number);
    for (const day of r.daysOfWeek) {
      await Notifications.scheduleNotificationAsync({
        identifier: `custom-${r.id}-${day}`,
        content: {
          title: r.title,
          body: reminderBody(r.type),
          sound: r.sound === 'silent' ? undefined : 'default',
        },
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

function reminderBody(type: CustomReminder['type']): string {
  switch (type) {
    case 'dhikr':
      return 'Time for dhikr — open Tasbih in Islamic app.';
    case 'dua':
      return 'Time for dua — read and listen in Duas section.';
    case 'quran':
      return 'Time for Quran — continue your reading.';
    default:
      return 'Your spiritual reminder is due.';
  }
}
