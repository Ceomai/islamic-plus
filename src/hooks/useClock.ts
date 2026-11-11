import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDateKey, msUntilNextLocalMidnight } from '../utils/date';

const MINUTE_MS = 60_000;
/** Fires just after midnight, so the new day has certainly begun */
const MIDNIGHT_MARGIN_MS = 1000;

interface ClockOptions<T> {
  /** First tick on the next full minute, then every `intervalMs` (clock-like updates) */
  alignToMinute?: boolean;
  /** Ticks that compute an equal value keep the previous one, so the component does not re-render */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * A value derived from the current time, recomputed every `intervalMs`. The component re-renders
 * only when the value changes; a new `compute` (pass a memoized one) is applied in the same render.
 */
export function useClockValue<T>(compute: (now: number) => T, intervalMs: number, options: ClockOptions<T> = {}): T {
  const { alignToMinute = false, isEqual = Object.is } = options;
  const [state, setState] = useState(() => ({ compute, value: compute(Date.now()) }));
  let current = state;
  if (state.compute !== compute) {
    current = { compute, value: compute(Date.now()) };
    setState(current);
  }

  useEffect(() => {
    const tick = () =>
      setState((prev) => {
        const value = prev.compute(Date.now());
        return isEqual(prev.value, value) ? prev : { compute: prev.compute, value };
      });
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      interval = setInterval(tick, intervalMs);
    };
    if (!alignToMinute) {
      start();
      return () => clearInterval(interval);
    }
    const toNextMinute = MINUTE_MS - (Date.now() % MINUTE_MS);
    const first = setTimeout(() => {
      tick();
      start();
    }, toNextMinute);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [intervalMs, alignToMinute, isEqual]);

  return current.value;
}

const identity = (now: number) => now;

/** The current time in ms, updated every `intervalMs`. Re-renders on every tick: keep its user small. */
export function useNow(intervalMs: number, alignToMinute = false): number {
  return useClockValue(identity, intervalMs, { alignToMinute });
}

/**
 * Today's local date key (YYYY-MM-DD). Changes at local midnight while the app stays open, and is
 * checked again whenever the app returns to the foreground (timers may not run in the background).
 */
export function useDayKey(): string {
  const [day, setDay] = useState(() => localDateKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnight = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextLocalMidnight() + MIDNIGHT_MARGIN_MS);
    };
    const refresh = () => {
      setDay(localDateKey());
      scheduleMidnight();
    };
    scheduleMidnight();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return day;
}
