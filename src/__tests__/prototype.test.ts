import { describe, expect, it, jest } from '@jest/globals';
import { HADITH_LIBRARY, hadithEdition, sectionOfHadith } from '../services/hadithApi';
import { EMPTY_KAZA, applyKazaChange, estimateKaza, kazaRemaining } from '../services/kaza';
import { MAX_CUSTOM_SLOTS, NOTIFICATION_BUDGET, prayerDaysAhead, reminderSlots, remindersWithinBudget } from '../services/notificationBudget';
import { widgetPropsAt, widgetTimeline } from '../services/homeWidget';
import { getPrayerDates } from '../services/prayerTimes';
import { buildImsakiye, fastCountdown, formatDuration, ramadanWindow } from '../services/ramadan';
import type { CustomReminder } from '../types';
import { addDays } from '../utils/date';

jest.mock('../services/storage', () => ({ getJson: jest.fn(), setJson: jest.fn(), storageKeys: {} }));
jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

const reminder = (id: string, days: number[], over: Partial<CustomReminder> = {}): CustomReminder => ({
  id,
  title: id,
  time: '08:00',
  daysOfWeek: days,
  type: 'dhikr',
  enabled: true,
  sound: 'default',
  ...over,
});
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

describe('notification budget (iOS keeps 64)', () => {
  it('counts an every-day reminder as one daily trigger', () => {
    expect(reminderSlots(reminder('a', EVERY_DAY))).toBe(1);
    expect(reminderSlots(reminder('b', [1, 3, 5]))).toBe(3);
    expect(reminderSlots(reminder('c', [1], { enabled: false }))).toBe(0);
    expect(reminderSlots(reminder('d', [1], { time: '25:99' }))).toBe(0);
  });

  it('keeps a full week of prayers when reminders are few', () => {
    expect(prayerDaysAhead([], 5)).toBe(7);
    expect(prayerDaysAhead([reminder('a', EVERY_DAY), reminder('b', EVERY_DAY)], 5)).toBe(7);
  });

  it('shortens the prayer window instead of exceeding the limit', () => {
    // 5 reminders on 5 weekdays each = 25 slots → (60 - 1 - 25) / 5 = 6 days
    const many = Array.from({ length: 5 }, (_, i) => reminder(`r${i}`, [1, 2, 3, 4, 5]));
    const days = prayerDaysAhead(many, 5);
    expect(days).toBe(6);
    expect(days * 5 + 25 + 1).toBeLessThanOrEqual(NOTIFICATION_BUDGET);
  });

  it('caps custom reminders and never drops prayers below one day', () => {
    const tooMany = Array.from({ length: 10 }, (_, i) => reminder(`r${i}`, [1, 2, 3, 4, 5, 6]));
    const kept = remindersWithinBudget(tooMany);
    expect(kept.reduce((s, r) => s + reminderSlots(r), 0)).toBeLessThanOrEqual(MAX_CUSTOM_SLOTS);
    expect(prayerDaysAhead(tooMany, 5)).toBeGreaterThanOrEqual(1);
  });
});

describe('Ramadan', () => {
  it('finds the next Ramadan from an ordinary day', () => {
    const today = new Date(2026, 9, 27, 12);
    const r = ramadanWindow(today);
    expect(r.inRamadan).toBe(false);
    expect(r.daysUntil).toBeGreaterThan(0);
    expect(r.start.getTime()).toBeGreaterThan(today.getTime());
    expect([29, 30]).toContain(r.length);
  });

  it('knows the day of Ramadan inside the month', () => {
    const { start } = ramadanWindow(new Date(2026, 9, 27, 12));
    const r = ramadanWindow(addDays(start, 3));
    expect(r.inRamadan).toBe(true);
    expect(r.dayOfRamadan).toBe(4);
    expect(r.daysUntil).toBe(0);
  });

  it('builds a timetable with suhoor before iftar every day (Istanbul, Diyanet)', () => {
    const r = ramadanWindow(new Date(2026, 9, 27, 12));
    const days = buildImsakiye(41.0082, 28.9784, 'turkey', 'hanafi', r);
    expect(days).toHaveLength(r.length);
    expect(days[0].day).toBe(1);
    for (const d of days) {
      expect(d.imsak.getTime()).toBeLessThan(d.sunrise.getTime());
      expect(d.sunrise.getTime()).toBeLessThan(d.iftar.getTime());
      expect(d.iftar.getTime()).toBeLessThan(d.isha.getTime());
    }
  });

  it('counts down to suhoor or iftar depending on the time of day', () => {
    const fajr = new Date(2027, 1, 10, 5, 50);
    const maghrib = new Date(2027, 1, 10, 18, 20);
    const tomorrowFajr = new Date(2027, 1, 11, 5, 49);
    expect(fastCountdown(new Date(2027, 1, 10, 4, 0), { fajr, maghrib }, tomorrowFajr)).toEqual({ kind: 'sahur', target: fajr });
    expect(fastCountdown(new Date(2027, 1, 10, 12, 0), { fajr, maghrib }, tomorrowFajr)).toEqual({ kind: 'iftar', target: maghrib });
    expect(fastCountdown(new Date(2027, 1, 10, 21, 0), { fajr, maghrib }, tomorrowFajr)).toEqual({ kind: 'sahur', target: tomorrowFajr });
    expect(formatDuration(2 * 3600000 + 5 * 60000 + 1)).toEqual({ h: 2, m: 6 });
  });
});

describe('prayer times match Diyanet', () => {
  const clock = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

  it('Istanbul, 27–28 October 2026 (namazvakitleri.diyanet.gov.tr)', () => {
    const expected: Record<number, string[]> = {
      27: ['05:56', '07:22', '12:53', '15:46', '18:14', '19:34'],
      28: ['05:57', '07:23', '12:53', '15:45', '18:13', '19:33'],
    };
    for (const day of [27, 28]) {
      // Hanafi users get Diyanet's Asr too (asr-ı evvel), not the later Hanafi time
      const t = getPrayerDates(41.0082, 28.9784, new Date(Date.UTC(2026, 9, day, 9)), 'turkey', 'hanafi');
      expect([t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(clock)).toEqual(expected[day]);
    }
  });

  it('keeps the later Hanafi Asr with other methods', () => {
    const date = new Date(Date.UTC(2026, 9, 27, 9));
    const hanafi = getPrayerDates(41.0082, 28.9784, date, 'muslimWorldLeague', 'hanafi');
    const shafi = getPrayerDates(41.0082, 28.9784, date, 'muslimWorldLeague', 'shafi');
    expect(hanafi.asr.getTime() - shafi.asr.getTime()).toBeGreaterThan(30 * 60000);
  });
});

describe('home-screen widget data', () => {
  const input = { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul', method: 'turkey' as const, madhab: 'hanafi' as const, lang: 'tr' as const };

  it('highlights the next prayer of the day', () => {
    // 27 Oct 2026, 14:00 Istanbul → next is İkindi 15:46
    const props = widgetPropsAt(input, new Date(Date.UTC(2026, 9, 27, 11, 0)));
    expect(props.nextName).toBe('İkindi');
    expect(props.nextTime).toMatch(/15:46/);
    expect(props.times.filter((t) => t.isNext).map((t) => t.name)).toEqual(['İkindi']);
    expect(props.city).toBe('İstanbul');
  });

  it('after Isha shows tomorrow’s Fajr', () => {
    const props = widgetPropsAt(input, new Date(Date.UTC(2026, 9, 27, 20, 0)));
    expect(props.nextName).toBe('İmsak');
  });

  it('schedules an entry at every prayer in the next 24 hours', () => {
    const now = new Date(Date.UTC(2026, 9, 27, 11, 0));
    const entries = widgetTimeline(input, now);
    expect(entries[0].date).toBe(now);
    expect(entries.length).toBe(6); // now + 5 prayer changes
    for (let i = 1; i < entries.length; i++) expect(entries[i].date.getTime()).toBeGreaterThan(entries[i - 1].date.getTime());
    expect(entries[1].props.nextName).toBe('Akşam');
  });
});

describe('missed prayers (kaza)', () => {
  it('adds owed prayers and counts the ones made up', () => {
    let k = applyKazaChange(EMPTY_KAZA, 'fajr', 1);
    k = applyKazaChange(k, 'fajr', 1);
    k = applyKazaChange(k, 'fajr', -1);
    expect(k.counts.fajr).toBe(1);
    expect(k.madeUp).toBe(1);
  });

  it('never goes below zero', () => {
    expect(applyKazaChange(EMPTY_KAZA, 'isha', -1)).toBe(EMPTY_KAZA);
  });

  it('estimates one of each prayer per day, witr optional', () => {
    const withWitr = estimateKaza(EMPTY_KAZA, 1, 0, true);
    expect(withWitr.counts.dhuhr).toBe(365);
    expect(withWitr.counts.witr).toBe(365);
    expect(kazaRemaining(withWitr)).toBe(365 * 6);
    expect(estimateKaza(EMPTY_KAZA, 0, 10, false).counts.witr).toBe(0);
  });
});

describe('hadith library', () => {
  it('ships every collection with chapters and Turkish where available', () => {
    expect(HADITH_LIBRARY.map((c) => c.id)).toEqual(expect.arrayContaining(['bukhari', 'muslim', 'nawawi']));
    for (const c of HADITH_LIBRARY) expect(c.sections.length).toBeGreaterThan(0);
    const bukhari = HADITH_LIBRARY.find((c) => c.id === 'bukhari')!;
    expect(hadithEdition(bukhari, 'tr')).toBe('tur-bukhari');
    expect(hadithEdition(bukhari, 'ara')).toBe('ara-bukhari');
    const qudsi = HADITH_LIBRARY.find((c) => c.id === 'qudsi')!;
    expect(hadithEdition(qudsi, 'tr')).toBe('eng-qudsi');
  });

  it('finds the chapter of a hadith number for "continue reading"', () => {
    const bukhari = HADITH_LIBRARY.find((c) => c.id === 'bukhari')!;
    expect(sectionOfHadith(bukhari, 8)?.n).toBe(2);
    expect(sectionOfHadith(bukhari, 999999)).toBeUndefined();
  });
});
