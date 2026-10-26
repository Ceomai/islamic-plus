import { describe, expect, it, jest } from '@jest/globals';
import { normalizeReminderTime } from '../services/advancedReminders';
import { computePrayerStreak } from '../services/statistics';
import { summarizeTasbih } from '../services/tasbihStorage';
import { calculateZakat, type ZakatInput } from '../services/zakat';
import type { PrayerCompletion, TasbihData } from '../types';
import { addDays, lastDayKeys, localDateKey } from '../utils/date';

jest.mock('../services/storage', () => ({ getJson: jest.fn(), setJson: jest.fn(), storageKeys: {} }));
jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

describe('local dates', () => {
  it('keeps a time after midnight on the local day', () => {
    expect(localDateKey(new Date(2026, 9, 27, 0, 30))).toBe('2026-10-27');
  });

  it('lists the last days across a year boundary, oldest first', () => {
    expect(lastDayKeys(3, new Date(2026, 0, 2))).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
    expect(localDateKey(addDays(new Date(2026, 1, 28), 1))).toBe('2026-03-01');
  });
});

describe('prayer streak', () => {
  const full = (d: string): PrayerCompletion[] =>
    (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((p) => ({ id: p + d, prayer: p, date: d, completedAt: '' }) as PrayerCompletion);
  const today = new Date(2026, 9, 26, 15);

  it('counts full days ending yesterday while today is still open', () => {
    expect(computePrayerStreak([...full('2026-10-23'), ...full('2026-10-24'), ...full('2026-10-25')], today)).toBe(3);
  });
  it('counts today once all five prayers are marked', () => {
    expect(computePrayerStreak([...full('2026-10-25'), ...full('2026-10-26')], today)).toBe(2);
  });
  it('resets after a missing day', () => {
    expect(computePrayerStreak([...full('2026-10-23'), ...full('2026-10-25')], today)).toBe(1);
  });
  it('does not count a day with a missed prayer', () => {
    expect(computePrayerStreak([...full('2026-10-24'), ...full('2026-10-25').slice(0, 4)], today)).toBe(0);
  });
});

describe('reminder times', () => {
  it.each([
    ['8:30', '08:30'],
    ['08.30', '08:30'],
    ['830', '08:30'],
    ['6.15', '06:15'],
    ['25:00', null],
    ['25:99', null],
    ['abc', null],
  ])('%s → %s', (input, want) => {
    expect(normalizeReminderTime(input)).toBe(want);
  });
});

describe('zakat', () => {
  const base: ZakatInput = {
    cash: 0,
    goldGrams: 0,
    silverGrams: 0,
    investments: 0,
    businessAssets: 0,
    debts: 0,
    goldPricePerGram: 3000,
    silverPricePerGram: 0,
    nisabBasis: 'gold',
  };

  it('is not due when nothing is entered', () => {
    expect(calculateZakat({ ...base, goldPricePerGram: 0 }).isObligatory).toBe(false);
    expect(calculateZakat(base).isObligatory).toBe(false);
  });
  it('is 2.5% above the 85 g gold nisab', () => {
    const r = calculateZakat({ ...base, cash: 300000 });
    expect(r.nisabThreshold).toBe(255000);
    expect(r.zakatDue).toBe(7500);
  });
  it('uses 80.18 g for the Diyanet nisab', () => {
    const r = calculateZakat({ ...base, cash: 250000, nisabBasis: 'goldDiyanet' });
    expect(r.nisabThreshold).toBeCloseTo(240540);
    expect(r.isObligatory).toBe(true);
    expect(calculateZakat({ ...base, cash: 250000 }).isObligatory).toBe(false);
  });
  it('never reports negative wealth when debts are larger', () => {
    expect(calculateZakat({ ...base, cash: 1000, debts: 5000 }).totalWealth).toBe(0);
  });
});

describe('tasbih statistics', () => {
  it('sums today, the week and the hour of day from the log', () => {
    const today = localDateKey();
    const yesterday = localDateKey(addDays(new Date(), -1));
    const hours = (h: number, n: number) => Object.assign(new Array(24).fill(0), { [h]: n });
    const data: TasbihData = { count: 0, total: 500, sessions: [], log: { [today]: hours(19, 33), [yesterday]: hours(6, 99) } };
    const s = summarizeTasbih(data, 7);
    expect(s.today).toBe(33);
    expect(s.week).toBe(132);
    expect(s.total).toBe(500);
    expect(s.byHour[19]).toBe(33);
    expect(s.byHour[6]).toBe(99);
    expect(s.byDay.at(-1)).toEqual({ key: today, count: 33 });
  });
});
