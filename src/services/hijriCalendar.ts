import { toHijri, toGregorian } from 'hijri-converter';
import type { AppLanguage } from '../types';

export interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
  formatted: string;
}

const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  "Rabi' al-awwal",
  "Rabi' al-thani",
  'Jumada al-awwal',
  'Jumada al-thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

const HIJRI_MONTHS_TR = [
  'Muharrem',
  'Safer',
  'Rebiülevvel',
  'Rebiülahir',
  'Cemaziyelevvel',
  'Cemaziyelahir',
  'Recep',
  'Şaban',
  'Ramazan',
  'Şevval',
  'Zilkade',
  'Zilhicce',
];

export function hijriMonthNames(lang: AppLanguage): string[] {
  return lang === 'tr' ? HIJRI_MONTHS_TR : HIJRI_MONTHS_EN;
}

const ISLAMIC_EVENTS: { id: string; hijriMonth: number; hijriDay: number; en: string; tr: string }[] = [
  { id: 'new-year', hijriMonth: 1, hijriDay: 1, en: 'Islamic New Year', tr: 'Hicri Yılbaşı' },
  { id: 'ashura', hijriMonth: 1, hijriDay: 10, en: 'Day of Ashura', tr: 'Aşure Günü' },
  { id: 'mawlid', hijriMonth: 3, hijriDay: 12, en: 'Mawlid an-Nabi', tr: 'Mevlid Kandili' },
  { id: 'miraj', hijriMonth: 7, hijriDay: 27, en: "Laylat al-Mi'raj", tr: 'Miraç Kandili' },
  { id: 'baraah', hijriMonth: 8, hijriDay: 15, en: "Laylat al-Bara'ah", tr: 'Berat Kandili' },
  { id: 'ramadan', hijriMonth: 9, hijriDay: 1, en: 'Start of Ramadan', tr: 'Ramazan Başlangıcı' },
  { id: 'qadr', hijriMonth: 9, hijriDay: 27, en: 'Laylat al-Qadr (commonly observed)', tr: 'Kadir Gecesi' },
  { id: 'fitr', hijriMonth: 10, hijriDay: 1, en: 'Eid al-Fitr', tr: 'Ramazan Bayramı' },
  { id: 'adha', hijriMonth: 12, hijriDay: 10, en: 'Eid al-Adha', tr: 'Kurban Bayramı' },
];

export function gregorianToHijri(date: Date, lang: AppLanguage = 'en'): HijriDate {
  const h = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const monthName = hijriMonthNames(lang)[h.hm - 1] ?? '';
  return {
    day: h.hd,
    month: h.hm,
    monthName,
    year: h.hy,
    formatted: lang === 'tr' ? `${h.hd} ${monthName} ${h.hy}` : `${h.hd} ${monthName} ${h.hy} AH`,
  };
}

export function hijriToGregorian(hy: number, hm: number, hd: number): Date {
  const g = toGregorian(hy, hm, hd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

export interface UpcomingIslamicEvent {
  id: string;
  name: string;
  hijriLabel: string;
  date: Date;
  daysLeft: number;
}

const DAY_MS = 86_400_000;

/** Next occurrence of each event, soonest first (tabular calendar — local moon sighting may differ by a day). */
export function getUpcomingIslamicEvents(fromDate = new Date(), count = 6, lang: AppLanguage = 'en'): UpcomingIslamicEvent[] {
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const hijri = gregorianToHijri(today, lang);
  const months = hijriMonthNames(lang);

  return ISLAMIC_EVENTS.map((e) => {
    const passed = e.hijriMonth < hijri.month || (e.hijriMonth === hijri.month && e.hijriDay < hijri.day);
    const date = hijriToGregorian(passed ? hijri.year + 1 : hijri.year, e.hijriMonth, e.hijriDay);
    return {
      id: e.id,
      name: lang === 'tr' ? e.tr : e.en,
      hijriLabel: `${e.hijriDay} ${months[e.hijriMonth - 1]}`,
      date,
      daysLeft: Math.round((date.getTime() - today.getTime()) / DAY_MS),
    };
  })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, count);
}
