import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { mergeSyncPayloads, type SyncPayload } from '../services/cloudSync';
import { PRAYER_HISTORY_DAYS, mergePrayerCompletions, trimPrayerHistory } from '../services/prayerHistory';
import type { PrayerCompletion, PrayerName, UserSettings } from '../types';
import { addDays, localDateKey } from '../utils/date';

jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

import { loadPrayerCompletions, togglePrayerCompletion } from '../services/prayerTracking';

const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Five marks a day for `days` days, ending today */
function history(days: number, today = new Date()): PrayerCompletion[] {
  return Array.from({ length: days }, (_, i) => localDateKey(addDays(today, -i))).flatMap((date) =>
    PRAYERS.map((prayer) => ({ id: `pr-${date}-${prayer}`, prayer, date, completedAt: `${date}T12:00:00.000Z` }))
  );
}

function payload(settings: Partial<UserSettings>, exportedAt: string, extra: Partial<SyncPayload> = {}): SyncPayload {
  return {
    version: 2,
    exportedAt,
    profileScope: 'default',
    darkMode: false,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    habits: [],
    family: [],
    stats: { tasbihTotal: 0, habitsCompletedTotal: 0, duasReadCount: 0, quranSessions: 0, prayerStreakDays: 0, lastActiveDate: '', weeklyActivity: [0, 0, 0, 0, 0, 0, 0] },
    tasbih: { count: 0, total: 0, sessions: [] },
    duaProgress: {},
    prayerCompletions: [],
    educationProgress: [],
    zakatHistory: [],
    locationPref: null,
    ...extra,
  };
}

describe('settings in a sync (K1)', () => {
  it('a new device does not overwrite the account settings with its defaults', () => {
    const cloud = payload({ appLanguage: 'tr', calculationMethod: 'turkey', onboardingDone: true, updatedAt: '2026-10-01T10:00:00.000Z' }, '2026-10-01T10:00:00.000Z');
    const freshDevice = payload({ appLanguage: 'en', calculationMethod: 'muslimWorldLeague', onboardingDone: false }, '2026-11-03T09:00:00.000Z');
    const merged = mergeSyncPayloads(cloud, freshDevice);
    expect(merged.settings.appLanguage).toBe('tr');
    expect(merged.settings.calculationMethod).toBe('turkey');
    expect(merged.settings.onboardingDone).toBe(true);
  });

  it('the most recent user change wins, whichever device made it', () => {
    const cloud = payload({ madhab: 'shafi', updatedAt: '2026-11-02T10:00:00.000Z' }, '2026-11-02T10:00:00.000Z');
    const local = payload({ madhab: 'hanafi', updatedAt: '2026-11-03T08:00:00.000Z' }, '2026-11-03T09:00:00.000Z');
    expect(mergeSyncPayloads(cloud, local).settings.madhab).toBe('hanafi');
    expect(mergeSyncPayloads(local, cloud).settings.madhab).toBe('hanafi');
  });

  it('settings saved by older builds (no stamp) prefer the copy that finished setup', () => {
    const cloud = payload({ appLanguage: 'tr', onboardingDone: true }, '2026-09-01T10:00:00.000Z');
    const local = payload({ appLanguage: 'en', onboardingDone: false }, '2026-11-03T09:00:00.000Z');
    expect(mergeSyncPayloads(cloud, local).settings.appLanguage).toBe('tr');
  });
});

describe('prayer history (K2)', () => {
  it('keeps more than 500 marks: a year of prayers survives', () => {
    const year = history(365);
    expect(trimPrayerHistory(year)).toHaveLength(365 * 5);
  });

  it('drops only marks older than the history window', () => {
    const today = new Date(2026, 10, 3);
    const kept = trimPrayerHistory(history(PRAYER_HISTORY_DAYS + 10, today), today);
    expect(kept).toHaveLength((PRAYER_HISTORY_DAYS + 1) * 5);
  });

  it('a sync keeps the newest local marks even when the cloud already has hundreds', () => {
    const cloud = history(200).slice(5); // everything except today
    const todayOnDevice = history(1);
    const merged = mergePrayerCompletions(cloud, todayOnDevice);
    expect(merged).toHaveLength(200 * 5);
    expect(merged.slice(0, 5).every((p) => p.date === localDateKey())).toBe(true);
  });
});

describe('marking a prayer (rapid taps)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('applies every tap: two quick taps leave the prayer unmarked, three leave it marked', async () => {
    await Promise.all([togglePrayerCompletion('dhuhr'), togglePrayerCompletion('dhuhr')]);
    expect((await loadPrayerCompletions()).filter((p) => p.prayer === 'dhuhr')).toHaveLength(0);
    await Promise.all([togglePrayerCompletion('isha'), togglePrayerCompletion('isha'), togglePrayerCompletion('isha')]);
    expect((await loadPrayerCompletions()).filter((p) => p.prayer === 'isha')).toHaveLength(1);
  });

  it('two prayers marked in the same instant get different ids', async () => {
    await Promise.all([togglePrayerCompletion('fajr'), togglePrayerCompletion('asr')]);
    const ids = (await loadPrayerCompletions()).map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
  });
});
