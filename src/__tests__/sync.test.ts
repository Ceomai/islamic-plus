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

describe('deletions survive a sync (O1)', () => {
  const habit = (id: string) => ({ id, title: id, targetPerWeek: 7, completedDates: [], category: 'other' as const });
  it('a habit deleted on this device does not come back from the cloud', () => {
    const cloud = payload({}, '2026-11-01T10:00:00.000Z', { habits: [habit('a'), habit('b')] });
    const local = payload({}, '2026-11-03T10:00:00.000Z', {
      habits: [habit('a')],
      deleted: { habits: { b: '2026-11-02T10:00:00.000Z' }, family: {}, prayers: {} },
    });
    expect(mergeSyncPayloads(cloud, local).habits.map((h) => h.id)).toEqual(['a']);
  });

  it('an unmarked prayer stays unmarked, but marking it again later wins', () => {
    const mark = (completedAt: string) => ({ id: 'pr-2026-11-03-fajr', prayer: 'fajr' as const, date: '2026-11-03', completedAt });
    const unmarked = { habits: {}, family: {}, prayers: { 'fajr:2026-11-03': '2026-11-03T08:00:00.000Z' } };
    const cloud = payload({}, '2026-11-03T07:00:00.000Z', { prayerCompletions: [mark('2026-11-03T06:00:00.000Z')] });
    const local = payload({}, '2026-11-03T09:00:00.000Z', { deleted: unmarked });
    expect(mergeSyncPayloads(cloud, local).prayerCompletions).toHaveLength(0);
    const remarked = payload({}, '2026-11-03T09:30:00.000Z', { prayerCompletions: [mark('2026-11-03T09:10:00.000Z')], deleted: unmarked });
    expect(mergeSyncPayloads(cloud, remarked).prayerCompletions).toHaveLength(1);
  });

  it('family members added on either device are kept', () => {
    const m = (id: string) => ({ id, name: id, avatarEmoji: '🙂', role: 'child' as const, habitIds: [] });
    const merged = mergeSyncPayloads(payload({}, 'x', { family: [m('a'), m('b')] }), payload({}, 'y', { family: [m('c')] }));
    expect(merged.family.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('reading progress sync (O1, O6)', () => {
  const { mergeQuranProgress } = require('../services/readingProgressCloud') as typeof import('../services/readingProgressCloud');
  const bm = (ayahNumber: number, createdAt: string) => ({ id: `bm-${ayahNumber}`, surahNumber: 36, surahName: 'Yâsîn', edition: 'tr', ayahNumber, label: '', createdAt });
  it('keeps the place read last, not the copy synced last', () => {
    const local = { lastRead: { surahNumber: 2, ayahNumber: 100, surahName: 'Bakara', edition: 'tr', updatedAt: '2026-11-03T10:00:00.000Z' }, bookmarks: [], updatedAt: '2026-11-03T10:00:00.000Z' };
    const remote = { lastRead: { surahNumber: 2, ayahNumber: 20, surahName: 'Bakara', edition: 'tr', updatedAt: '2026-11-01T10:00:00.000Z' }, bookmarks: [], updatedAt: '2026-11-03T12:00:00.000Z' };
    expect(mergeQuranProgress(local as never, remote as never).lastRead?.ayahNumber).toBe(100);
  });
  it('a removed bookmark does not come back', () => {
    const local = { lastRead: null, bookmarks: [], removedBookmarks: { '36:5': '2026-11-03T10:00:00.000Z' } };
    const remote = { lastRead: null, bookmarks: [bm(5, '2026-11-01T10:00:00.000Z'), bm(9, '2026-11-01T10:00:00.000Z')] };
    expect(mergeQuranProgress(local as never, remote as never).bookmarks.map((b) => b.ayahNumber)).toEqual([9]);
  });
});

describe('prayer streak after a merge', () => {
  const stats = (prayerStreakDays: number) => ({ ...payload({}, '').stats, prayerStreakDays });

  it('is counted from the merged prayers, not the larger stored streak', () => {
    // Each device saw only part of the last three days; together they are complete
    const days = history(3);
    const cloud = payload({}, '2026-11-03T07:00:00.000Z', { prayerCompletions: days.filter((_, i) => i % 2 === 0), stats: stats(0) });
    const local = payload({}, '2026-11-03T09:00:00.000Z', { prayerCompletions: days.filter((_, i) => i % 2 === 1), stats: stats(0) });
    expect(mergeSyncPayloads(cloud, local).stats.prayerStreakDays).toBe(3);
  });

  it('drops days whose marks were removed on the other device', () => {
    const today = localDateKey();
    const removedToday = { habits: {}, family: {}, prayers: { [`fajr:${today}`]: '2999-01-01T00:00:00.000Z' } };
    const cloud = payload({}, '2026-11-03T07:00:00.000Z', { prayerCompletions: history(4), stats: stats(4) });
    const local = payload({}, '2026-11-03T09:00:00.000Z', { stats: stats(4), deleted: removedToday });
    // Today is incomplete now, so the streak is the three days before it
    expect(mergeSyncPayloads(cloud, local).stats.prayerStreakDays).toBe(3);
  });
});
