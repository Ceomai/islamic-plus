import type { CalculationMethodId, Madhab } from '../types';
import { addDays, localDateKey } from '../utils/date';
import { gregorianToHijri, hijriToGregorian } from './hijriCalendar';
import { getPrayerDates } from './prayerTimes';

/**
 * Ramadan dates come from the tabular (Umm al-Qura) Hijri calendar; the officially announced
 * start (e.g. by Diyanet) can differ by a day, which the screens say.
 */
export interface RamadanWindow {
  hijriYear: number;
  start: Date;
  /** Last day of Ramadan */
  end: Date;
  inRamadan: boolean;
  /** Days until the first day (0 while in Ramadan) */
  daysUntil: number;
  /** Day of Ramadan today (1-based), 0 when outside */
  dayOfRamadan: number;
  /** 29 or 30 days */
  length: number;
}

const midday = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const dayDiff = (a: Date, b: Date) => Math.round((midday(b).getTime() - midday(a).getTime()) / 86400000);

export function ramadanWindow(today: Date = new Date()): RamadanWindow {
  const h = gregorianToHijri(today);
  const hijriYear = h.month <= 9 ? h.year : h.year + 1;
  const start = hijriToGregorian(hijriYear, 9, 1);
  const end = addDays(hijriToGregorian(hijriYear, 10, 1), -1);
  const inRamadan = h.month === 9;
  return {
    hijriYear,
    start,
    end,
    inRamadan,
    daysUntil: inRamadan ? 0 : Math.max(0, dayDiff(today, start)),
    dayOfRamadan: inRamadan ? dayDiff(start, today) + 1 : 0,
    length: dayDiff(start, end) + 1,
  };
}

export interface ImsakiyeDay {
  day: number;
  key: string;
  date: Date;
  imsak: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  iftar: Date;
  isha: Date;
}

export function buildImsakiye(
  latitude: number,
  longitude: number,
  method: CalculationMethodId,
  madhab: Madhab,
  window: RamadanWindow
): ImsakiyeDay[] {
  const days = dayDiff(window.start, window.end) + 1;
  return Array.from({ length: days }, (_, i) => {
    const date = midday(addDays(window.start, i));
    const t = getPrayerDates(latitude, longitude, date, method, madhab);
    return {
      day: i + 1,
      key: localDateKey(date),
      date,
      imsak: t.fajr,
      sunrise: t.sunrise,
      dhuhr: t.dhuhr,
      asr: t.asr,
      iftar: t.maghrib,
      isha: t.isha,
    };
  });
}

export interface FastCountdown {
  kind: 'sahur' | 'iftar';
  target: Date;
}

/** Before imsak: time left for suhoor; during the fast: until iftar; after iftar: tomorrow's imsak. */
export function fastCountdown(now: Date, today: { fajr: Date; maghrib: Date }, tomorrowFajr: Date): FastCountdown {
  if (now < today.fajr) return { kind: 'sahur', target: today.fajr };
  if (now < today.maghrib) return { kind: 'iftar', target: today.maghrib };
  return { kind: 'sahur', target: tomorrowFajr };
}

export function formatDuration(ms: number): { h: number; m: number } {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
}
