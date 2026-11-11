import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MediaQueryHost = { matchMedia?: (query: string) => { matches: boolean } } | undefined;

/** Web: the browser's "reduce motion" preference; false where matchMedia is missing. */
export function webPrefersReducedMotion(host: MediaQueryHost = globalThis.window): boolean {
  try {
    return !!host?.matchMedia?.(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

// One app-wide subscription: every animated component reads the same flag
let reduced = false;
let started = false;
const listeners = new Set<() => void>();

function update(next: boolean) {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((listener) => listener());
}

function start() {
  if (started) return;
  started = true;
  if (Platform.OS === 'web') {
    reduced = webPrefersReducedMotion();
    const query = globalThis.window?.matchMedia?.(REDUCED_MOTION_QUERY);
    query?.addEventListener?.('change', (e) => update(e.matches));
    return;
  }
  AccessibilityInfo.isReduceMotionEnabled()
    .then(update)
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', update);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The system "Reduce Motion" setting, for code outside React (LayoutAnimation before a state change). */
export function isReducedMotionEnabled(): boolean {
  start();
  return reduced;
}

/** True while the user asked the system to reduce motion: no scale or travel, only short fades. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, isReducedMotionEnabled, isReducedMotionEnabled);
}
