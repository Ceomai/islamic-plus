import { useCallback, useMemo } from 'react';
import { getPrayerDates, nextPrayerFrom, type NextPrayer } from '../services/prayerTimes';
import { fastCountdown, formatDuration, type FastCountdown } from '../services/ramadan';
import type { CalculationMethodId, Madhab, PrayerName } from '../types';
import { addDays, dateFromKey } from '../utils/date';
import { useClockValue, useNow } from './useClock';

export interface PrayerDays {
  today: Record<PrayerName, Date>;
  tomorrow: Record<PrayerName, Date>;
}

/** Today's and tomorrow's prayer times for a place, computed once per day (`dayKey`). */
export function usePrayerDays(
  location: { latitude: number; longitude: number } | null,
  method: CalculationMethodId,
  madhab: Madhab,
  dayKey: string
): PrayerDays | null {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  return useMemo(() => {
    if (latitude === undefined || longitude === undefined) return null;
    const day = dateFromKey(dayKey);
    const calc = (d: Date) => getPrayerDates(latitude, longitude, d, method, madhab);
    return { today: calc(day), tomorrow: calc(addDays(day, 1)) };
  }, [latitude, longitude, method, madhab, dayKey]);
}

const sameNextPrayer = (a: NextPrayer | null, b: NextPrayer | null) =>
  a === b || (!!a && !!b && a.name === b.name && a.time.getTime() === b.time.getTime());

/** The next prayer, checked every `intervalMs`; re-renders only when it moves on to another prayer. */
export function useNextPrayer(days: PrayerDays | null, intervalMs: number): NextPrayer | null {
  const compute = useCallback(
    (now: number) => (days ? nextPrayerFrom(days.today, days.tomorrow.fajr, new Date(now)) : null),
    [days]
  );
  return useClockValue(compute, intervalMs, { isEqual: sameNextPrayer });
}

export interface FastCountdownState extends FastCountdown {
  remaining: { h: number; m: number };
}

/** During Ramadan: suhoor or iftar and the time left, re-rendering every `intervalMs`. */
export function useFastCountdown(
  days: PrayerDays | null,
  inRamadan: boolean,
  intervalMs: number,
  alignToMinute = false
): FastCountdownState | null {
  const now = useNow(intervalMs, alignToMinute);
  if (!days || !inRamadan) return null;
  const countdown = fastCountdown(new Date(now), days.today, days.tomorrow.fajr);
  return { ...countdown, remaining: formatDuration(countdown.target.getTime() - now) };
}
