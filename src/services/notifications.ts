import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerLabel, translate } from '../i18n';
import type { DisabledPrayerRule, PrayerName, UserSettings } from '../types';
import { localDateKey } from '../utils/date';
import { createSerialQueue } from '../utils/serial';
import { prayerDaysAhead } from './notificationBudget';
import { PRAYER_CATEGORY, setupPrayerCategory } from './prayerAction';
import { getPrayerDates } from './prayerTimes';
import { getStorageUser } from './storage';

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
/** Android plays the channel's sound, not the notification's, so each sound choice has a channel */
const ADHAN_CHANNEL_ID = 'prayer-adhan-v1';
const SILENT_CHANNEL_ID = 'prayer-silent-v1';
/** Bundled through the expo-notifications plugin (app.json); 28 s, under iOS's 30 s limit */
const ADHAN_SOUND_FILE = 'adhan_short.wav';

function soundFor(sound: string | undefined): { sound?: string; channelId: string } {
  if (sound === 'silent') return { sound: undefined, channelId: SILENT_CHANNEL_ID };
  if (sound === 'adhan_short' || sound === 'adhan_full') return { sound: ADHAN_SOUND_FILE, channelId: ADHAN_CHANNEL_ID };
  return { sound: 'default', channelId: PRAYER_CHANNEL_ID };
}
const NOTIFY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
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

/** Whether the system lets the app show notifications (no prompt) */
export async function notificationsAllowed(): Promise<boolean> {
  if (!notificationsSupported) return true;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

/**
 * Android 12+ needs the "Alarms & reminders" permission for on-the-minute notifications; on
 * Android 14+ it starts off for new installs, and without it prayer alerts can arrive minutes late.
 */
export async function exactAlarmsAllowed(): Promise<boolean> {
  if (!notificationsSupported || Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true; // API missing (older build): nothing the user can do
  }
}

/** Opens the system screen for exact alarms; resolves when the user comes back */
export async function requestExactAlarms(): Promise<boolean> {
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function cancelPrayerNotifications(isStale: () => boolean): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isStale()) return;
    if (n.identifier.startsWith('prayer-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// Cancel-then-schedule is not atomic: runs go one after another, and a run that a newer request
// has replaced stops at its next step (the newer run cancels and schedules everything again)
const scheduleQueue = createSerialQueue();
let scheduleGeneration = 0;

/** Replaces the scheduled prayer notifications. Never asks for permission (onboarding and settings do). */
export function schedulePrayerNotifications(latitude: number, longitude: number, settings: UserSettings): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  const generation = ++scheduleGeneration;
  const isStale = () => generation !== scheduleGeneration;
  return scheduleQueue(() => scheduleNow(latitude, longitude, settings, isStale));
}

async function scheduleNow(
  latitude: number,
  longitude: number,
  settings: UserSettings,
  isStale: () => boolean
): Promise<void> {
  if (isStale()) return;
  await cancelPrayerNotifications(isStale);
  if (isStale() || !settings.globalNotificationsEnabled) return;

  if (!(await notificationsAllowed()) || isStale()) return;
  // The "Prayed" button's label follows the app language
  await setupPrayerCategory(settings.appLanguage);
  if (isStale()) return;
  // A "Prayed" tap is applied only to the account the notification was scheduled for
  const scope = getStorageUser();

  const now = new Date();
  // Shares iOS's 64-notification limit with custom reminders (see notificationBudget)
  const perDay = NOTIFY_PRAYERS.filter((p) => settings.prayerNotifications[p]?.enabled).length;
  const daysAhead = prayerDaysAhead(settings.customReminders ?? [], perDay);
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
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

      if (isStale()) return;
      const prayerLabel = getPrayerLabel(settings.appLanguage, prayer);
      const tone = soundFor(notifSettings.sound);
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${prayer}-${dayOffset}`,
        content: {
          title: translate(settings.appLanguage, 'notifications.title', { prayer: prayerLabel }),
          body: translate(settings.appLanguage, 'notifications.body', { prayer: prayerLabel }),
          sound: tone.sound,
          categoryIdentifier: PRAYER_CATEGORY,
          data: { prayer, date: localDateKey(date), scope },
          ...(Platform.OS === 'android' && { channelId: tone.channelId }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }
  }

  // The window ends after daysAhead days unless the app is opened again; say so on the last evening
  if (perDay > 0 && !isStale()) {
    const notice = new Date();
    notice.setDate(notice.getDate() + daysAhead - 1);
    notice.setHours(21, 0, 0, 0);
    if (notice > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'prayer-refresh',
        content: {
          title: translate(settings.appLanguage, 'notifications.refreshTitle'),
          body: translate(settings.appLanguage, 'notifications.refreshBody'),
          ...(Platform.OS === 'android' && { channelId: PRAYER_CHANNEL_ID }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notice },
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
    await Notifications.setNotificationChannelAsync(ADHAN_CHANNEL_ID, {
      name: 'Prayer times (adhan)',
      importance: Notifications.AndroidImportance.HIGH,
      sound: ADHAN_SOUND_FILE,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: 'Prayer times (silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [0, 250],
    });
  }
}
