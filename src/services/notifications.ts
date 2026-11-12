import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { UserSettings } from '../types';
import { createSerialQueue } from '../utils/serial';
import { shouldAskNotificationPermission, type NotificationPromptInputs } from './notificationPrompt';
import { setupPrayerCategory } from './prayerAction';
import { ADHAN_CHANNEL_ID, ADHAN_SOUND_FILE, PRAYER_CHANNEL_ID, SILENT_CHANNEL_ID, buildPrayerTriggers } from './prayerTriggers';
import { getJson, getStorageUser, setJson, storageKeys } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const notificationsSupported = Platform.OS !== 'web';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  await markNotificationPermissionAsked();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const markNotificationPermissionAsked = () =>
  setJson(storageKeys.notificationPermissionAsked, true).catch(() => undefined);

let promptInFlight: Promise<boolean> | null = null;

/**
 * Shows the system notification prompt once on this device when the introduction ended without it
 * (see shouldAskNotificationPermission). Resolves true when notifications became allowed.
 */
export function askNotificationPermissionOnce(
  context: Pick<NotificationPromptInputs, 'onboardingDone' | 'hasLocation' | 'notificationsEnabled'>
): Promise<boolean> {
  if (!notificationsSupported) return Promise.resolve(false);
  if (!promptInFlight) {
    promptInFlight = askOnceNow(context).finally(() => {
      promptInFlight = null;
    });
  }
  return promptInFlight;
}

async function askOnceNow(
  context: Pick<NotificationPromptInputs, 'onboardingDone' | 'hasLocation' | 'notificationsEnabled'>
): Promise<boolean> {
  const alreadyAsked = await getJson(storageKeys.notificationPermissionAsked, false);
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (!shouldAskNotificationPermission({ ...context, alreadyAsked, status, canAskAgain })) return false;
  // Remembered before the prompt opens, so a crash or a second call never asks twice
  await markNotificationPermissionAsked();
  return (await Notifications.requestPermissionsAsync()).granted;
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

/**
 * Stops a scheduling run that is under way (sign-out: it would add the previous account's
 * notifications back after they were cancelled). Resolves once that run has stopped.
 */
export function cancelPrayerScheduling(): Promise<void> {
  ++scheduleGeneration;
  return scheduleQueue(async () => undefined);
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

  for (const trigger of buildPrayerTriggers(settings, { latitude, longitude }, new Date(), scope)) {
    if (isStale()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: trigger.identifier,
      content: { ...trigger.content, ...(Platform.OS === 'android' && { channelId: trigger.channelId }) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger.date },
    });
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
