import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, jest } from '@jest/globals';
import { isGuestFeatureAllowed } from '../config/featureAccess';
import { CITIES, suggestedMethodFor } from '../data/cities';
import {
  ackPendingPrayerMarks,
  handlePrayerResponse,
  marksForScope,
  peekPendingPrayerMarks,
  PRAYED_ACTION,
  retagPendingPrayerMarks,
} from '../services/prayerAction';
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

  const asr = { prayer: 'asr', date: '2026-11-04', scope: 'user-a' } as const;

  it('queues the prayer from the notification once and keeps it until it is acknowledged', async () => {
    await AsyncStorage.clear();
    expect(await handlePrayerResponse(response(PRAYED_ACTION, asr))).toBe(true);
    expect(await handlePrayerResponse(response(PRAYED_ACTION, asr))).toBe(true);
    expect(await peekPendingPrayerMarks('user-a')).toEqual([asr]);
    // Applying failed before the ack: the mark is still there next time
    expect(await peekPendingPrayerMarks('user-a')).toEqual([asr]);
    await ackPendingPrayerMarks([asr]);
    expect(await peekPendingPrayerMarks('user-a')).toEqual([]);
  });

  it('applies a mark only to the account the notification was for', async () => {
    await AsyncStorage.clear();
    const other = { ...asr, prayer: 'isha', scope: 'user-b' } as const;
    await handlePrayerResponse(response(PRAYED_ACTION, asr));
    await handlePrayerResponse(response(PRAYED_ACTION, other));
    expect(await peekPendingPrayerMarks(null)).toEqual([]);
    expect(await peekPendingPrayerMarks('guest')).toEqual([]);
    expect(await peekPendingPrayerMarks('user-b')).toEqual([other]);
    await ackPendingPrayerMarks([other]);
    // The other account's mark waits for that account
    expect(await peekPendingPrayerMarks('user-a')).toEqual([asr]);
  });

  it('hands a guest’s waiting marks to the account the guest creates', async () => {
    await AsyncStorage.clear();
    const guestAsr = { ...asr, scope: 'guest' } as const;
    const guestIsha = { ...asr, prayer: 'isha', scope: 'guest' } as const;
    const other = { ...asr, scope: 'user-b' } as const;
    for (const mark of [guestAsr, guestIsha, other, asr]) await handlePrayerResponse(response(PRAYED_ACTION, mark));

    expect(await retagPendingPrayerMarks('guest', 'user-a')).toBe(2);
    expect(await peekPendingPrayerMarks('guest')).toEqual([]);
    // The asr mark the account already had is kept once
    expect(await peekPendingPrayerMarks('user-a')).toEqual([asr, { ...guestIsha, scope: 'user-a' }]);
    expect(await peekPendingPrayerMarks('user-b')).toEqual([other]);
    expect(await retagPendingPrayerMarks('guest', 'user-a')).toBe(0);
  });

  it('matches marks by scope, and none without a session', () => {
    const b = { ...asr, scope: 'user-b' };
    expect(marksForScope([asr, b], 'user-b')).toEqual([b]);
    expect(marksForScope([asr, b], null)).toEqual([]);
  });

  it('ignores a plain tap, malformed data and notifications without an account', async () => {
    expect(await handlePrayerResponse(response('expo.modules.notifications.actions.DEFAULT', asr))).toBe(false);
    expect(await handlePrayerResponse(response(PRAYED_ACTION, { ...asr, date: 'today' }))).toBe(false);
    expect(await handlePrayerResponse(response(PRAYED_ACTION, { prayer: 'asr', date: '2026-11-04' }))).toBe(false);
  });

  it('marks a prayer without ever un-marking it', async () => {
    await AsyncStorage.clear();
    expect(await markPrayerCompleted('isha', '2026-11-03')).toBe(true);
    expect(await markPrayerCompleted('isha', '2026-11-03')).toBe(false);
    expect((await loadPrayerCompletions()).map((p) => p.id)).toEqual(['pr-2026-11-03-isha']);
  });
});
