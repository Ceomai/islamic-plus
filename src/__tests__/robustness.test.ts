import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { schedulePrayerNotifications } from '../services/notifications';
import { prayerScheduleKey } from '../services/prayerScheduleKey';
import { loadStats, recordActivity, updatePrayerStreak } from '../services/statistics';
import { setStorageUser } from '../services/storage';
import { incrementTasbih, loadTasbihData, saveTasbihData } from '../services/tasbihStorage';
import { addDays, localDateKey } from '../utils/date';

// A tiny stand-in for the system's list of scheduled notifications
type Scheduled = { identifier: string; content: { data?: Record<string, unknown> } };
const mockScheduled = new Map<string, Scheduled>();
const mockRequestPermissions = jest.fn(async () => ({ status: 'granted', granted: true }));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestPermissionsAsync: mockRequestPermissions,
  getAllScheduledNotificationsAsync: jest.fn(async () => {
    await tick();
    return [...mockScheduled.values()];
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    await tick();
    mockScheduled.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (req: Scheduled) => {
    await tick();
    mockScheduled.set(req.identifier, req);
    return req.identifier;
  }),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
}));
jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('tasbih taps near the target', () => {
  it('completes the round exactly once when taps arrive together', async () => {
    await saveTasbihData({ count: 31, total: 31, sessions: [], log: {} });
    const results = await Promise.all([incrementTasbih(33, 'x'), incrementTasbih(33, 'x'), incrementTasbih(33, 'x')]);

    expect(results.map((r) => r.roundCompleted)).toEqual([false, true, false]);
    expect(results.map((r) => r.count)).toEqual([32, 0, 1]);
    const data = await loadTasbihData();
    expect(data.count).toBe(1);
    expect(data.total).toBe(34);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({ count: 33, target: 33, dhikrId: 'x' });
  });
});

describe('activity stats', () => {
  it('keeps every change when they are recorded at the same time', async () => {
    await Promise.all([
      ...Array.from({ length: 20 }, () => recordActivity('tasbih')),
      updatePrayerStreak([]),
      recordActivity('dua'),
    ]);
    const stats = await loadStats();
    expect(stats.tasbihTotal).toBe(20);
    expect(stats.duasReadCount).toBe(1);
    expect(stats.dailyPoints?.[localDateKey()]).toBe(20 + 8);
  });

  it('puts points on the given day', async () => {
    const yesterday = localDateKey(addDays(new Date(), -1));
    const stats = await recordActivity('prayer', 1, yesterday);
    expect(stats.dailyPoints).toEqual({ [yesterday]: 10 });
    expect(stats.lastActiveDate).toBe(localDateKey());
  });
});

describe('prayer notification schedule', () => {
  const istanbul = { latitude: 41.0082, longitude: 28.9784 };

  it('changes only with what the notifications depend on', () => {
    const base = prayerScheduleKey(DEFAULT_SETTINGS, istanbul);
    expect(prayerScheduleKey({ ...DEFAULT_SETTINGS, themeId: 'midnight', darkMode: true }, istanbul)).toBe(base);
    expect(prayerScheduleKey({ ...DEFAULT_SETTINGS, cloudSync: { ...DEFAULT_SETTINGS.cloudSync, lastSyncAt: 'x' } }, istanbul)).toBe(base);
    expect(prayerScheduleKey(DEFAULT_SETTINGS, { latitude: 41.00821, longitude: 28.97838 })).toBe(base);
    expect(prayerScheduleKey({ ...DEFAULT_SETTINGS, madhab: 'shafi' }, istanbul)).not.toBe(base);
    expect(prayerScheduleKey({ ...DEFAULT_SETTINGS, globalNotificationsEnabled: false }, istanbul)).not.toBe(base);
    expect(prayerScheduleKey(DEFAULT_SETTINGS, { latitude: 39.93, longitude: 32.85 })).not.toBe(base);
  });

  it('lets the latest request win, tags each notification with the account and never asks for permission', async () => {
    mockScheduled.clear();
    setStorageUser('user-a');
    const on = { ...DEFAULT_SETTINGS, globalNotificationsEnabled: true };
    const first = schedulePrayerNotifications(istanbul.latitude, istanbul.longitude, on);
    const second = schedulePrayerNotifications(istanbul.latitude, istanbul.longitude, on);
    const last = schedulePrayerNotifications(istanbul.latitude, istanbul.longitude, { ...on, globalNotificationsEnabled: false });
    await Promise.all([first, second, last]);
    // Notifications switched off last: nothing is left from the earlier runs
    expect(mockScheduled.size).toBe(0);

    await schedulePrayerNotifications(istanbul.latitude, istanbul.longitude, on);
    const prayers = [...mockScheduled.values()].filter((n) => n.content.data?.prayer);
    expect(prayers.length).toBeGreaterThan(0);
    expect(prayers.every((n) => n.content.data?.scope === 'user-a')).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    setStorageUser(null);
  });
});
