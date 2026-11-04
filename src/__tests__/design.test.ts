import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, jest } from '@jest/globals';
import { isGuestFeatureAllowed } from '../config/featureAccess';
import { CITIES, suggestedMethodFor } from '../data/cities';
import { handlePrayerResponse, PRAYED_ACTION, takePendingPrayerMarks } from '../services/prayerAction';
import { loadPrayerCompletions, markPrayerCompleted } from '../services/prayerTracking';
import { countPrayersInDays } from '../services/statistics';
import type { PrayerCompletion } from '../types';
import { stepTime } from '../utils/time';

jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  registerTaskAsync: jest.fn(),
}));
jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

describe('reminder time stepper', () => {
  it('moves hours and wraps around midnight', () => {
    expect(stepTime('08:30', 'hour', 1)).toBe('09:30');
    expect(stepTime('23:10', 'hour', 1)).toBe('00:10');
    expect(stepTime('00:10', 'hour', -1)).toBe('23:10');
  });

  it('moves minutes in 5-minute steps and snaps off-grid times', () => {
    expect(stepTime('08:30', 'minute', 1)).toBe('08:35');
    expect(stepTime('08:00', 'minute', -1)).toBe('07:55');
    expect(stepTime('23:55', 'minute', 1)).toBe('00:00');
    expect(stepTime('07:32', 'minute', 1)).toBe('07:35');
    expect(stepTime('07:32', 'minute', -1)).toBe('07:30');
  });
});

describe('this week instead of a streak', () => {
  const mark = (date: string, prayer: PrayerCompletion['prayer']): PrayerCompletion => ({ id: `${date}${prayer}`, prayer, date, completedAt: '' });

  it('counts marks in the last 7 days only, once per prayer and day', () => {
    const today = new Date(2026, 10, 4, 12);
    const list = [
      mark('2026-11-04', 'fajr'),
      mark('2026-11-04', 'fajr'),
      mark('2026-11-01', 'isha'),
      mark('2026-10-29', 'asr'),
      mark('2026-10-28', 'asr'), // 8 days ago
    ];
    expect(countPrayersInDays(list, 7, today)).toBe(3);
  });
});

describe('guest access', () => {
  it('opens everything except cloud sync to guests', () => {
    for (const id of ['ai_assistant', 'statistics', 'family_mode', 'themes', 'widgets', 'advanced_reminders']) {
      expect(isGuestFeatureAllowed(id, true)).toBe(true);
    }
    expect(isGuestFeatureAllowed('cloud_sync', true)).toBe(false);
    expect(isGuestFeatureAllowed('cloud_sync', false)).toBe(true);
  });
});

describe('calculation method by country', () => {
  const city = (id: string) => CITIES.find((c) => c.id === id)!;

  it('suggests Diyanet in Türkiye and for Turkish communities in Europe', () => {
    expect(suggestedMethodFor(city('tr-istanbul'))).toBe('turkey');
    expect(suggestedMethodFor(CITIES.find((c) => c.country === 'DE')!)).toBe('turkey');
  });

  it('uses the local authority elsewhere', () => {
    expect(suggestedMethodFor(CITIES.find((c) => c.country === 'SA')!)).toBe('ummAlQura');
    expect(suggestedMethodFor(CITIES.find((c) => c.country === 'US')!)).toBe('northAmerica');
  });
});

describe('"Prayed" notification button', () => {
  const response = (actionIdentifier: string, data: object) =>
    ({ actionIdentifier, notification: { request: { identifier: 'prayer-asr-0', content: { data } } } }) as never;

  it('queues the prayer from the notification and applies it once', async () => {
    await AsyncStorage.clear();
    expect(await handlePrayerResponse(response(PRAYED_ACTION, { prayer: 'asr', date: '2026-11-04' }))).toBe(true);
    expect(await handlePrayerResponse(response(PRAYED_ACTION, { prayer: 'asr', date: '2026-11-04' }))).toBe(true);
    expect(await takePendingPrayerMarks()).toEqual([{ prayer: 'asr', date: '2026-11-04' }]);
    expect(await takePendingPrayerMarks()).toEqual([]);
  });

  it('ignores a plain tap and malformed data', async () => {
    expect(await handlePrayerResponse(response('expo.modules.notifications.actions.DEFAULT', { prayer: 'asr', date: '2026-11-04' }))).toBe(false);
    expect(await handlePrayerResponse(response(PRAYED_ACTION, { prayer: 'asr', date: 'today' }))).toBe(false);
  });

  it('marks a prayer without ever un-marking it', async () => {
    await AsyncStorage.clear();
    expect(await markPrayerCompleted('isha', '2026-11-03')).toBe(true);
    expect(await markPrayerCompleted('isha', '2026-11-03')).toBe(false);
    expect((await loadPrayerCompletions()).map((p) => p.id)).toEqual(['pr-2026-11-03-isha']);
  });
});
