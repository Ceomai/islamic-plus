import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { updatePrayerWidget, type WidgetInput } from './homeWidget';

/**
 * Android widgets have no timeline, so a periodic background task moves "next prayer" forward
 * while the app is closed. iOS widgets schedule their own timeline and don't need this.
 * The task runs without the signed-in account's storage, so the widget input is kept in a
 * device-wide key.
 */
const TASK = 'prayer-widget-refresh';
const INPUT_KEY = '@islamic/widget-input';
const INTERVAL_MINUTES = 30;

export async function saveWidgetInput(input: WidgetInput): Promise<void> {
  await AsyncStorage.setItem(INPUT_KEY, JSON.stringify(input)).catch(() => undefined);
}

/** Must run at app start (module scope) so Android can execute the task headless. */
export function defineWidgetTask(): void {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BackgroundTaskResult } = require('expo-background-task') as typeof import('expo-background-task');
    if (TaskManager.isTaskDefined(TASK)) return;
    TaskManager.defineTask(TASK, async () => {
      try {
        const raw = await AsyncStorage.getItem(INPUT_KEY);
        if (raw) updatePrayerWidget(JSON.parse(raw) as WidgetInput);
        return BackgroundTaskResult.Success;
      } catch {
        return BackgroundTaskResult.Failed;
      }
    });
  } catch {
    // Expo Go or web: no background task support
  }
}

export async function registerWidgetTask(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    if (await TaskManager.isTaskRegisteredAsync(TASK)) return;
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: INTERVAL_MINUTES });
  } catch {
    // Not available here (Expo Go); the widget still updates whenever the app opens
  }
}
