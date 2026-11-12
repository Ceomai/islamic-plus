import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab as AdhanMadhab,
  PrayerTimes as AdhanPrayerTimes,
  Rounding,
} from 'adhan';
import type { CalculationMethodId, Madhab, PrayerName } from '../types';

const methodMap: Record<CalculationMethodId, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
  muslimWorldLeague: CalculationMethod.MuslimWorldLeague,
  egyptian: CalculationMethod.Egyptian,
  karachi: CalculationMethod.Karachi,
  ummAlQura: CalculationMethod.UmmAlQura,
  dubai: CalculationMethod.Dubai,
  moonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  northAmerica: CalculationMethod.NorthAmerica,
  kuwait: CalculationMethod.Kuwait,
  qatar: CalculationMethod.Qatar,
  singapore: CalculationMethod.Singapore,
  tehran: CalculationMethod.Tehran,
  turkey: CalculationMethod.Turkey,
};

function calculate(latitude: number, longitude: number, date: Date, method: CalculationMethodId, madhab: Madhab) {
  const params = methodMap[method]();
  // Only the Asr shadow length differs by madhab in adhan: Hanafi uses twice the length.
  // Diyanet publishes Asr by the first time (asr-ı evvel, one shadow length) for everyone, so the
  // Diyanet method follows its calendar even for Hanafi users; otherwise times differ by ~40 min.
  params.madhab = madhab === 'hanafi' && method !== 'turkey' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  if (method === 'turkey') {
    // Rounded by hand below (Diyanet's caution rule); its Asr precaution is one minute longer
    params.rounding = Rounding.None;
    params.adjustments.asr += 1;
  }
  const coordinates = new Coordinates(latitude, longitude);
  // Fajr/Isha where twilight never ends (summer at high latitudes): recommended night-fraction rule
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  return new AdhanPrayerTimes(coordinates, date, params);
}

/** Latitude used when the real one has no usable times (the common "nearest latitude" rule) */
const FALLBACK_LATITUDE = 48.5;

const ORDER: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Every time is a real date and they follow each other in the day's order */
function usable(t: Record<PrayerName, Date>): boolean {
  return ORDER.every((p, i) => !Number.isNaN(t[p].getTime()) && (i === 0 || t[p] > t[ORDER[i - 1]]));
}

const MINUTE = 60000;
const floorMinute = (d: Date) => new Date(Math.floor(d.getTime() / MINUTE) * MINUTE);
const ceilMinute = (d: Date) => new Date(Math.ceil(d.getTime() / MINUTE) * MINUTE);

/**
 * Diyanet rounds to the cautious side: imsak earlier (fasting starts sooner), every other time
 * later (a prayer is never started early). Checked against Diyanet's Istanbul calendar:
 * 16 of 18 times match exactly, the rest are 1 minute off (nearest rounding matched 10).
 */
function diyanetRounding(t: Record<PrayerName, Date>): Record<PrayerName, Date> {
  return {
    fajr: floorMinute(t.fajr),
    sunrise: ceilMinute(t.sunrise),
    dhuhr: ceilMinute(t.dhuhr),
    asr: ceilMinute(t.asr),
    maghrib: ceilMinute(t.maghrib),
    isha: ceilMinute(t.isha),
  };
}

/** The day's prayer times as Date objects; format them with formatClock, never parse clock strings. */
export function getPrayerDates(
  latitude: number,
  longitude: number,
  date: Date,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): Record<PrayerName, Date> {
  const pick = (lat: number) => {
    const times = calculate(lat, longitude, date, calculationMethod, madhab);
    return { fajr: times.fajr, sunrise: times.sunrise, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha };
  };
  let out = pick(latitude);
  // Near the poles the sun may not rise or set at all: adhan then returns Invalid Date ("NaN:NaN"
  // on the home screen) or times out of order. Use the same longitude at 48.5° instead.
  if (!usable(out) && Math.abs(latitude) > FALLBACK_LATITUDE) out = pick(Math.sign(latitude) * FALLBACK_LATITUDE);
  return calculationMethod === 'turkey' ? diyanetRounding(out) : out;
}

/** 24-hour clock for Turkish, 12-hour for English. */
export function formatClock(date: Date, lang: 'en' | 'tr'): string {
  if (Number.isNaN(date.getTime())) return '--:--';
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  if (lang === 'tr') return `${String(h).padStart(2, '0')}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const DAILY: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface NextPrayer {
  name: PrayerName;
  time: Date;
  /** Today's prayers have all passed: this is tomorrow's Fajr */
  isTomorrow: boolean;
}

/** Next obligatory prayer after `now` from already computed times; after Isha, tomorrow's Fajr. */
export function nextPrayerFrom(today: Record<PrayerName, Date>, tomorrowFajr: Date, now: Date): NextPrayer {
  const next = DAILY.find((p) => today[p] > now);
  return next ? { name: next, time: today[next], isTomorrow: false } : { name: 'fajr', time: tomorrowFajr, isTomorrow: true };
}

/** Next obligatory prayer from now; after Isha this is tomorrow's Fajr. */
export function getNextPrayer(
  latitude: number,
  longitude: number,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): NextPrayer {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return nextPrayerFrom(
    getPrayerDates(latitude, longitude, now, calculationMethod, madhab),
    getPrayerDates(latitude, longitude, tomorrow, calculationMethod, madhab).fajr,
    now
  );
}
