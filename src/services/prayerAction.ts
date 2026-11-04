import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translate } from '../i18n';
import type { AppLanguage, PrayerName } from '../types';
import { createSerialQueue } from '../utils/serial';

/**
 * "Prayed" button on prayer notifications: marks the prayer without opening the app.
 * On Android the tap is handled in a headless task, which has no signed-in account's storage, so
 * marks wait in a device-wide queue and the app applies them to the account when it next runs.
 * iOS opens the app for the action and it is applied right away.
 */
export const PRAYER_CATEGORY = 'prayer';
export const PRAYED_ACTION = 'prayed';
const TASK = 'prayer-notification-action';
const QUEUE_KEY = '@islamic/pending-prayer-marks';

export interface PendingPrayerMark {
  prayer: PrayerName;
  /** Local date (YYYY-MM-DD) of the prayer the notification was for */
  date: string;
}

const supported = Platform.OS !== 'web';

export async function setupPrayerCategory(lang: AppLanguage): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY, [
      {
        identifier: PRAYED_ACTION,
        buttonTitle: translate(lang, 'notifications.prayedAction'),
        options: { opensAppToForeground: Platform.OS === 'ios' },
      },
    ]);
  } catch {
    // Older build without categories: the notification still shows, just without the button
  }
}

function markFrom(response: Notifications.NotificationResponse): PendingPrayerMark | null {
  if (response.actionIdentifier !== PRAYED_ACTION) return null;
  const data = response.notification.request.content.data as Partial<PendingPrayerMark> | undefined;
  if (!data?.prayer || !data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
  return { prayer: data.prayer, date: data.date };
}

// Queue writes run one after another so two quick taps don't overwrite each other
const serial = createSerialQueue();

function queueMark(mark: PendingPrayerMark): Promise<void> {
  return serial(async () => {
    const list = await readQueue();
    if (!list.some((m) => m.prayer === mark.prayer && m.date === mark.date)) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...list, mark]));
    }
  });
}

async function readQueue(): Promise<PendingPrayerMark[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as PendingPrayerMark[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Removes and returns the marks waiting to be applied. */
export function takePendingPrayerMarks(): Promise<PendingPrayerMark[]> {
  return serial(async () => {
    const list = await readQueue();
    if (list.length > 0) await AsyncStorage.removeItem(QUEUE_KEY);
    return list;
  });
}

/** Queues the mark when the response is a "Prayed" tap and clears the notification. */
export async function handlePrayerResponse(response: Notifications.NotificationResponse): Promise<boolean> {
  const mark = markFrom(response);
  if (!mark) return false;
  await queueMark(mark);
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  return true;
}

/** Must run at app start (module scope) so Android can run the task when the app is closed. */
export function definePrayerActionTask(): void {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    if (TaskManager.isTaskDefined(TASK)) return;
    TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data }) => {
      if (data && 'actionIdentifier' in data) await handlePrayerResponse(data).catch(() => undefined);
    });
    void Notifications.registerTaskAsync(TASK).catch(() => undefined);
  } catch {
    // Expo Go: no background tasks; the button then works while the app is running
  }
}
