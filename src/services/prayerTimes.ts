import { CalculationMethod, Coordinates, Madhab as AdhanMadhab, PrayerTimes as AdhanPrayerTimes } from 'adhan';
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
  // Only the Asr shadow length differs by madhab in adhan: Hanafi uses twice the length
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  return new AdhanPrayerTimes(new Coordinates(latitude, longitude), date, params);
}

/** The day's prayer times as Date objects; format them with formatClock, never parse clock strings. */
export function getPrayerDates(
  latitude: number,
  longitude: number,
  date: Date,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): Record<PrayerName, Date> {
  const times = calculate(latitude, longitude, date, calculationMethod, madhab);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

/** 24-hour clock for Turkish, 12-hour for English. */
export function formatClock(date: Date, lang: 'en' | 'tr'): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  if (lang === 'tr') return `${String(h).padStart(2, '0')}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const DAILY: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Next obligatory prayer from now; after Isha this is tomorrow's Fajr. */
export function getNextPrayer(
  latitude: number,
  longitude: number,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): { name: PrayerName; time: Date } | null {
  const now = new Date();
  const today = getPrayerDates(latitude, longitude, now, calculationMethod, madhab);
  const next = DAILY.find((p) => today[p] > now);
  if (next) return { name: next, time: today[next] };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { name: 'fajr', time: getPrayerDates(latitude, longitude, tomorrow, calculationMethod, madhab).fajr };
}
