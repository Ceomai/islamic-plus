import { describe, expect, it, jest } from '@jest/globals';
import { getReply, spokenReply, type AssistantBackends, type ReplyContext } from '../services/assistantSession';
import type { AssistantReply } from '../services/aiAssistant';
import { dayOfYear, duaOfTheDay, pickForDay } from '../services/dailyDua';
import { logError } from '../services/errorLog';
import { fireAndForget } from '../services/fireAndForget';
import { createHabit, toggleHabitDate } from '../services/habits';
import { isSameLocation, type StoredLocation } from '../services/location';
import { nextPrayerFrom } from '../services/prayerTimes';
import { formatDuration } from '../services/ramadan';
import type { PrayerName, SpiritualHabit } from '../types';
import { dateFromKey, msUntilNextLocalMidnight } from '../utils/date';
import { haversineKm } from '../utils/geo';
import { formatRemaining } from '../utils/time';

// Hoisted above the imports by babel-jest
jest.mock('../config/supabase', () => ({ getSupabase: () => null }));
jest.mock('../services/errorLog', () => ({ logError: jest.fn(async () => undefined) }));

describe('habits', () => {
  const base: SpiritualHabit = { id: '1', title: 'Quran', targetPerWeek: 5, completedDates: ['2026-11-10'], category: 'quran' };

  it('creates a habit with the creation time as id and nothing completed', () => {
    expect(createHabit({ title: 'Dhikr', targetPerWeek: 7, category: 'dhikr' }, 1700000000000)).toEqual({
      title: 'Dhikr',
      targetPerWeek: 7,
      category: 'dhikr',
      id: '1700000000000',
      completedDates: [],
    });
  });

  it('marks a day and reports it as a completion', () => {
    const { habits, completed } = toggleHabitDate([base], '1', '2026-11-11');
    expect(completed).toBe(true);
    expect(habits[0].completedDates).toEqual(['2026-11-10', '2026-11-11']);
  });

  it('unmarks a marked day without counting it', () => {
    const { habits, completed } = toggleHabitDate([base], '1', '2026-11-10');
    expect(completed).toBe(false);
    expect(habits[0].completedDates).toEqual([]);
  });

  it('leaves other habits (and the input) untouched', () => {
    const other = { ...base, id: '2' };
    const input = [base, other];
    const { habits, completed } = toggleHabitDate(input, '3', '2026-11-11');
    expect(completed).toBe(false);
    expect(habits[1]).toBe(other);
    expect(base.completedDates).toEqual(['2026-11-10']);
  });
});

describe('dua of the day', () => {
  it('counts days of the year from 1 January', () => {
    expect(dayOfYear(new Date(2026, 0, 1, 0, 30))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31, 23, 59))).toBe(365);
  });

  it('counts the leap day', () => {
    expect(dayOfYear(new Date(2028, 1, 29))).toBe(60);
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366);
  });

  it('crosses the year boundary', () => {
    expect(dayOfYear(new Date(2026, 11, 31, 23, 59))).toBe(365);
    expect(dayOfYear(new Date(2027, 0, 1, 0, 1))).toBe(1);
  });

  it('uses only the calendar date, so a DST hour shift cannot move it to yesterday', () => {
    // 00:30 on the day after a spring-forward change: an hour short since 1 January
    const afterDst = {
      getFullYear: () => 2026,
      getMonth: () => 2,
      getDate: () => 30,
      getTime: () => Date.UTC(2026, 2, 29, 23, 30),
    } as unknown as Date;
    expect(dayOfYear(afterDst)).toBe(dayOfYear(new Date(2026, 2, 30, 12)));
  });

  it('keeps the same dua all day and rotates through the list', () => {
    const duas = ['a', 'b', 'c'];
    expect(duaOfTheDay(new Date(2026, 0, 1, 0, 1))).toBe(duaOfTheDay(new Date(2026, 0, 1, 23, 59)));
    expect(duaOfTheDay(new Date(2026, 0, 1))).toBeDefined();
    expect(pickForDay(new Date(2026, 0, 1), duas)).toBe('b');
    expect(pickForDay(new Date(2026, 0, 2), duas)).toBe('c');
  });
});

describe('time left', () => {
  it('rounds to the nearest minute for the next-prayer countdown', () => {
    expect(formatRemaining(2 * 3600000 + 5 * 60000 + 20000)).toEqual({ h: 2, m: 5 });
    expect(formatRemaining(29_000)).toEqual({ h: 0, m: 0 });
    expect(formatRemaining(-60000)).toEqual({ h: 0, m: 0 });
  });

  it('rounds up for the Ramadan countdowns', () => {
    expect(formatRemaining(60000 * 59 + 1, 'up')).toEqual({ h: 1, m: 0 });
    expect(formatDuration(29_000)).toEqual({ h: 0, m: 1 });
  });
});

describe('local midnight', () => {
  it('measures the time to the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 11, 23, 0))).toBe(3600000);
    expect(msUntilNextLocalMidnight(new Date(2026, 11, 31, 23, 59, 59))).toBe(1000);
  });

  it('reads a day key back as local midnight', () => {
    expect(dateFromKey('2026-03-05').getTime()).toBe(new Date(2026, 2, 5).getTime());
  });
});

describe('next prayer from computed times', () => {
  const day = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
  const today: Record<PrayerName, Date> = {
    fajr: day(11, 6),
    sunrise: day(11, 7, 30),
    dhuhr: day(11, 12, 30),
    asr: day(11, 15),
    maghrib: day(11, 17),
    isha: day(11, 18, 30),
  };
  const tomorrowFajr = day(12, 6, 1);

  it('finds the next obligatory prayer of the day, skipping sunrise', () => {
    expect(nextPrayerFrom(today, tomorrowFajr, day(11, 7))).toEqual({ name: 'dhuhr', time: today.dhuhr, isTomorrow: false });
  });

  it("gives tomorrow's Fajr once Isha has begun", () => {
    expect(nextPrayerFrom(today, tomorrowFajr, day(11, 18, 30))).toEqual({ name: 'fajr', time: tomorrowFajr, isTomorrow: true });
  });
});

describe('same place', () => {
  const here: StoredLocation = { latitude: 41.0082, longitude: 28.9784, city: 'Istanbul', updatedAt: '2026-11-01T00:00:00Z' };

  it('measures distances on the globe', () => {
    expect(haversineKm(41.0082, 28.9784, 39.9334, 32.8597)).toBeGreaterThan(340);
    expect(haversineKm(41.0082, 28.9784, 39.9334, 32.8597)).toBeLessThan(360);
  });

  it('treats a fix within a kilometre in the same city as no move', () => {
    expect(isSameLocation(here, { ...here, latitude: 41.0122, updatedAt: 'later' })).toBe(true);
  });

  it('sees a move when far away, in another city or when GPS replaces a picked city', () => {
    expect(isSameLocation(here, { ...here, latitude: 41.03 })).toBe(false);
    expect(isSameLocation(here, { ...here, city: 'Beyoğlu' })).toBe(false);
    expect(isSameLocation({ ...here, cityId: 'istanbul' }, here)).toBe(false);
    expect(isSameLocation(null, here)).toBe(false);
  });
});

describe('fire and forget', () => {
  it('logs a rejection with its tag instead of leaving it unhandled', async () => {
    fireAndForget(Promise.reject(new Error('boom')), 'test.tag');
    await new Promise((r) => setTimeout(r, 0));
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: 'test.tag: boom' }), 'promise');
  });
});

describe('assistant session', () => {
  const ctx: ReplyContext = {
    appLang: 'en',
    quranEdition: 'en.sahih',
    nextPrayer: null,
    today: '2026-11-11',
    history: [],
    limitedNote: 'Daily limit reached.',
  };
  const local: AssistantReply = { lang: 'en', text: 'Local answer', actions: [], matched: true };

  const backends = (over: Partial<AssistantBackends>): AssistantBackends => ({
    remoteAvailable: async () => false,
    askRemote: async () => null,
    askLocal: () => local,
    trackUnmatched: jest.fn(),
    ...over,
  });

  it('answers on the device when the server assistant is off, without posting the question first', async () => {
    const onRemoteStart = jest.fn(async () => undefined);
    const reply = await getReply('hi', ctx, onRemoteStart, backends({}));
    expect(reply).toEqual({ text: 'Local answer', actions: [], autoNavigate: undefined, questionPosted: false });
    expect(onRemoteStart).not.toHaveBeenCalled();
  });

  it('reports unmatched on-device questions', async () => {
    const trackUnmatched = jest.fn();
    await getReply('?', ctx, async () => undefined, backends({ trackUnmatched, askLocal: () => ({ ...local, matched: false, lang: 'tr' }) }));
    expect(trackUnmatched).toHaveBeenCalledWith('tr');
  });

  it("uses the server's answer and its page", async () => {
    const target = { screen: 'Qibla' };
    const onRemoteStart = jest.fn(async () => undefined);
    const reply = await getReply(
      'qibla',
      ctx,
      onRemoteStart,
      backends({ remoteAvailable: async () => true, askRemote: async () => ({ text: 'Server', actions: [], autoNavigate: target }) })
    );
    expect(onRemoteStart).toHaveBeenCalledTimes(1);
    expect(reply).toEqual({ text: 'Server', actions: [], autoNavigate: target, questionPosted: true });
  });

  it('falls back to the device when the server fails, and adds the note at the daily limit', async () => {
    const failed = await getReply('x', ctx, async () => undefined, backends({ remoteAvailable: async () => true }));
    expect(failed.text).toBe('Local answer');
    expect(failed.questionPosted).toBe(true);
    const limited = await getReply(
      'x',
      ctx,
      async () => undefined,
      backends({ remoteAvailable: async () => true, askRemote: async () => ({ text: '', actions: [], limited: true }) })
    );
    expect(limited.text).toBe('Local answer\n\nDaily limit reached.');
  });

  it('reads replies without the formatting marks', () => {
    expect(spokenReply('**Fajr** at `05:12`')).toBe('Fajr at 05:12');
  });
});
