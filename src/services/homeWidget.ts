import { Platform } from 'react-native';
import { getPrayerLabel, translate } from '../i18n';
import type { AppLanguage, CalculationMethodId, Madhab, PrayerName } from '../types';
import { addDays } from '../utils/date';
import type { PrayerWidgetProps } from '../widgets/types';
import { gregorianToHijri } from './hijriCalendar';
import { formatClock, getPrayerDates } from './prayerTimes';

const DAILY: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface WidgetInput {
  latitude: number;
  longitude: number;
  city?: string;
  method: CalculationMethodId;
  madhab: Madhab;
  lang: AppLanguage;
}

/** What the widget shows at moment `at`: that day's times with the next prayer highlighted. */
export function widgetPropsAt(input: WidgetInput, at: Date): PrayerWidgetProps {
  const today = getPrayerDates(input.latitude, input.longitude, at, input.method, input.madhab);
  let day = today;
  let next = DAILY.find((p) => today[p] > at);
  // After Isha the widget already shows tomorrow, starting with Fajr
  if (!next) {
    day = getPrayerDates(input.latitude, input.longitude, addDays(at, 1), input.method, input.madhab);
    next = 'fajr';
  }
  return {
    city: input.city ?? 'Islamic+',
    hijri: gregorianToHijri(day.fajr, input.lang).formatted,
    nextLabel: translate(input.lang, 'home.nextPrayer'),
    nextName: getPrayerLabel(input.lang, next),
    nextTime: formatClock(day[next], input.lang),
    times: DAILY.map((p) => ({ name: getPrayerLabel(input.lang, p), time: formatClock(day[p], input.lang), isNext: p === next })),
  };
}

/**
 * Timeline for the next 24 hours: one entry now and one at every prayer time, so the widget moves
 * to the next prayer on its own without the app running (iOS).
 */
export function widgetTimeline(input: WidgetInput, now: Date = new Date()): { date: Date; props: PrayerWidgetProps }[] {
  const entries = [{ date: now, props: widgetPropsAt(input, now) }];
  for (const offset of [0, 1]) {
    const times = getPrayerDates(input.latitude, input.longitude, addDays(now, offset), input.method, input.madhab);
    for (const p of DAILY) {
      const at = times[p];
      if (at > now && at.getTime() - now.getTime() <= 24 * 3600000) {
        // One second past the prayer time so that prayer counts as passed
        const date = new Date(at.getTime() + 1000);
        entries.push({ date, props: widgetPropsAt(input, date) });
      }
    }
  }
  return entries;
}

/**
 * Pushes fresh data to the home-screen widget. The native module exists only in development
 * and store builds (not Expo Go or web), so any failure here is expected and ignored.
 */
export function updatePrayerWidget(input: WidgetInput): void {
  if (Platform.OS === 'web') return;
  try {
    // Loaded lazily: importing expo-widgets throws where its native module is missing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('../widgets/PrayerWidget').default as {
      updateSnapshot(props: PrayerWidgetProps): void;
      updateTimeline?(entries: { date: Date; props: PrayerWidgetProps }[]): void;
    };
    if (Platform.OS === 'ios' && widget.updateTimeline) widget.updateTimeline(widgetTimeline(input));
    else widget.updateSnapshot(widgetPropsAt(input, new Date()));
  } catch {
    // Expo Go: no widget extension
  }
}
