import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translate } from '../i18n';
import type { AppLanguage, PrayerName } from '../types';
import { createSerialQueue } from '../utils/serial';

/**
 * "Prayed" button on prayer notifications: marks the prayer without opening the app.
 * On Android the tap is handled in a headless task, which has no signed-in account's storage, so
 * marks wait in a device-wide queue and the app applies them when that account next runs: each
 * notification carries the account it was scheduled for, so a mark never lands on another one.
 * iOS opens the app for the action and it is applied right away.
 */
export const PRAYER_CATEGORY = 'prayer';
export const PRAYED_ACTION = 'prayed';
const TASK = 'prayer-notification-action';
const QUEUE_KEY = '@islamic/pending-prayer-marks';
const MAX_QUEUED = 50;

export interface PendingPrayerMark {
  prayer: PrayerName;
  /** Local date (YYYY-MM-DD) of the prayer the notification was for */
  date: string;
  /** Storage scope of the account the notification was scheduled for (see storage.ts) */
  scope: string;
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
  // Notifications scheduled before marks carried an account can't be attributed to anyone
  if (typeof data.scope !== 'string' || !data.scope) return null;
  return { prayer: data.prayer, date: data.date, scope: data.scope };
}

const sameMark = (a: PendingPrayerMark, b: PendingPrayerMark) =>
  a.prayer === b.prayer && a.date === b.date && a.scope === b.scope;

/** Marks that belong to the signed-in account; none without one. */
export function marksForScope(list: PendingPrayerMark[], scope: string | null): PendingPrayerMark[] {
  if (!scope) return [];
  return list.filter((m) => m.scope === scope);
}

// Queue writes run one after another so two quick taps don't overwrite each other
const serial = createSerialQueue();

function queueMark(mark: PendingPrayerMark): Promise<void> {
  return serial(async () => {
    const list = await readQueue();
    if (!list.some((m) => sameMark(m, mark))) {
      // Marks of an account that never signs in here again would otherwise pile up forever
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...list, mark].slice(-MAX_QUEUED)));
    }
  });
}

async function readQueue(): Promise<PendingPrayerMark[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as PendingPrayerMark[]) : [];
    // Entries queued before marks carried an account belong to nobody we can tell
    return Array.isArray(list) ? list.filter((m) => typeof m?.scope === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * The marks waiting for this account, left in the queue until `ackPendingPrayerMarks` so a failure
 * while applying them doesn't lose them. Other accounts' marks stay for when they sign in.
 */
export function peekPendingPrayerMarks(scope: string | null): Promise<PendingPrayerMark[]> {
  return serial(async () => marksForScope(await readQueue(), scope));
}

/** Removes marks that have been applied. */
export function ackPendingPrayerMarks(done: PendingPrayerMark[]): Promise<void> {
  if (done.length === 0) return Promise.resolve();
  return serial(async () => {
    const list = await readQueue();
    const rest = list.filter((m) => !done.some((d) => sameMark(d, m)));
    if (rest.length === list.length) return;
    if (rest.length > 0) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
    else await AsyncStorage.removeItem(QUEUE_KEY);
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
