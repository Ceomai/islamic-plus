import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerLabel, translate } from '../i18n';
import type { DisabledPrayerRule, PrayerName, UserSettings } from '../types';
import { getPrayerTimes } from './prayerTimes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isPrayerDisabled(
  prayer: PrayerName,
  date: Date,
  rules: DisabledPrayerRule[]
): boolean {
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();
  return rules.some(
    (r) =>
      r.prayer === prayer &&
      (r.specificDates.includes(dateStr) || r.daysOfWeek.includes(dayOfWeek))
  );
}

function parseTimeOnDate(timeStr: string, date: Date): Date {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return date;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export async function requestNotificationPermissions(): Promise<boolean> {
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
  await cancelPrayerNotifications();
  if (!settings.globalNotificationsEnabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const notifyPrayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const schedule = getPrayerTimes(
      latitude,
      longitude,
      date,
      settings.calculationMethod,
      settings.madhab
    );

    for (const prayer of notifyPrayers) {
      const notifSettings = settings.prayerNotifications[prayer];
      if (!notifSettings?.enabled) continue;
      if (isPrayerDisabled(prayer, date, settings.disabledPrayerRules)) continue;

      let triggerDate = parseTimeOnDate(schedule.times[prayer], date);
      if (notifSettings.advanceMinutes > 0) {
        triggerDate = new Date(triggerDate.getTime() - notifSettings.advanceMinutes * 60000);
      }
      if (triggerDate <= new Date()) continue;

      const sound =
        notifSettings.sound === 'silent'
          ? false
          : notifSettings.sound === 'default'
            ? 'default'
            : notifSettings.sound;

      const prayerLabel = getPrayerLabel(settings.appLanguage, prayer);
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${prayer}-${dayOffset}`,
        content: {
          title: translate(settings.appLanguage, 'notifications.title', { prayer: prayerLabel }),
          body: translate(settings.appLanguage, 'notifications.body', { prayer: prayerLabel }),
          sound: sound === false ? undefined : sound,
          ...(Platform.OS === 'android' && { channelId: 'prayer-times' }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }
  }
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'Prayer Times',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'adhan_short.wav',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
