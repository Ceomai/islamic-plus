import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerLabel, translate } from '../i18n';
import type { DisabledPrayerRule, PrayerName, UserSettings } from '../types';
import { localDateKey } from '../utils/date';
import { getPrayerDates } from './prayerTimes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Android channel. v2 replaces the original "prayer-times" channel, which pointed at an adhan
 * sound file that was never bundled; channel sounds can't be changed once a channel exists.
 */
export const PRAYER_CHANNEL_ID = 'prayer-times-v2';
const NOTIFY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const DAYS_AHEAD = 7;
const notificationsSupported = Platform.OS !== 'web';

function isPrayerDisabled(prayer: PrayerName, date: Date, rules: DisabledPrayerRule[]): boolean {
  const dateStr = localDateKey(date);
  const dayOfWeek = date.getDay();
  return rules.some(
    (r) => r.prayer === prayer && (r.specificDates.includes(dateStr) || r.daysOfWeek.includes(dayOfWeek))
  );
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('prayer-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function schedulePrayerNotifications(
  latitude: number,
  longitude: number,
  settings: UserSettings
): Promise<void> {
  if (!notificationsSupported) return;
  await cancelPrayerNotifications();
  if (!settings.globalNotificationsEnabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const now = new Date();
  for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(12, 0, 0, 0);

    // Use the computed Date objects directly: formatting to a clock string and parsing it back
    // depended on the device locale (e.g. Turkish "ÖS" instead of "PM").
    const times = getPrayerDates(latitude, longitude, date, settings.calculationMethod, settings.madhab);

    for (const prayer of NOTIFY_PRAYERS) {
      const notifSettings = settings.prayerNotifications[prayer];
      if (!notifSettings?.enabled) continue;
      if (isPrayerDisabled(prayer, date, settings.disabledPrayerRules)) continue;

      const triggerDate = new Date(times[prayer].getTime() - (notifSettings.advanceMinutes ?? 0) * 60000);
      if (triggerDate <= now) continue;

      const prayerLabel = getPrayerLabel(settings.appLanguage, prayer);
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${prayer}-${dayOffset}`,
        content: {
          title: translate(settings.appLanguage, 'notifications.title', { prayer: prayerLabel }),
          body: translate(settings.appLanguage, 'notifications.body', { prayer: prayerLabel }),
          // Custom adhan sounds are not bundled yet; anything but "silent" uses the system sound
          sound: notifSettings.sound === 'silent' ? undefined : 'default',
          ...(Platform.OS === 'android' && { channelId: PRAYER_CHANNEL_ID }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }
  }
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
      name: 'Prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
