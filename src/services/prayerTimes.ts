import {
  CalculationMethod,
  Coordinates,
  Madhab as AdhanMadhab,
  Prayer,
  PrayerTimes as AdhanPrayerTimes,
} from 'adhan';
import type { CalculationMethodId, Madhab, PrayerName, PrayerSchedule } from '../types';

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function getPrayerTimes(
  latitude: number,
  longitude: number,
  date: Date,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): PrayerSchedule {
  const coords = new Coordinates(latitude, longitude);
  const params = methodMap[calculationMethod]();
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;

  const times = new AdhanPrayerTimes(coords, date, params);

  return {
    date: date.toISOString().split('T')[0],
    times: {
      fajr: formatTime(times.fajr),
      sunrise: formatTime(times.sunrise),
      dhuhr: formatTime(times.dhuhr),
      asr: formatTime(times.asr),
      maghrib: formatTime(times.maghrib),
      isha: formatTime(times.isha),
    },
  };
}

/** Same calculation as getPrayerTimes, but as Date objects so screens can format and compare them. */
export function getPrayerDates(
  latitude: number,
  longitude: number,
  date: Date,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): Record<PrayerName, Date> {
  const params = methodMap[calculationMethod]();
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  const times = new AdhanPrayerTimes(new Coordinates(latitude, longitude), date, params);
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

export function getNextPrayer(
  latitude: number,
  longitude: number,
  calculationMethod: CalculationMethodId,
  madhab: Madhab
): { name: PrayerName; time: Date; remaining: string } | null {
  const now = new Date();
  const coords = new Coordinates(latitude, longitude);
  const params = methodMap[calculationMethod]();
  params.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  const times = new AdhanPrayerTimes(coords, now, params);

  const sequence: { name: PrayerName; time: Date }[] = [
    { name: 'fajr', time: times.fajr },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'asr', time: times.asr },
    { name: 'maghrib', time: times.maghrib },
    { name: 'isha', time: times.isha },
  ];

  for (const p of sequence) {
    if (p.time > now) {
      const diff = p.time.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return { name: p.name, time: p.time, remaining: `${h}h ${m}m` };
    }
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = new AdhanPrayerTimes(coords, tomorrow, params);
  const diff = tomorrowTimes.fajr.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { name: 'fajr', time: tomorrowTimes.fajr, remaining: `${h}h ${m}m` };
}

export function prayerNameToAdhan(prayer: PrayerName): (typeof Prayer)[keyof typeof Prayer] | null {
  const map: Partial<Record<PrayerName, (typeof Prayer)[keyof typeof Prayer]>> = {
    fajr: Prayer.Fajr,
    dhuhr: Prayer.Dhuhr,
    asr: Prayer.Asr,
    maghrib: Prayer.Maghrib,
    isha: Prayer.Isha,
  };
  return map[prayer] ?? null;
}
