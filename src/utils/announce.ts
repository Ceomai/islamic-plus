import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Speaks a status change for screen-reader users. Android reads the same text through
 * accessibilityLiveRegion="polite" on the element showing it, so only iOS needs the explicit call
 * (calling it on both would announce twice on Android).
 * Pass `hasLiveRegion: false` when no live region shows the message.
 */
export function announce(message: string, opts: { hasLiveRegion?: boolean } = {}): void {
  // Without a live region showing the text (e.g. a counter that changes on every tap) Android needs the call too
  const hasLiveRegion = opts.hasLiveRegion ?? true;
  if (!message || Platform.OS === 'web' || (hasLiveRegion && Platform.OS !== 'ios')) return;
  AccessibilityInfo.announceForAccessibility(message);
}
