import type { ThemeMode } from '../types';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Reads the appearance choice from stored or synced settings.
 *
 * Older builds only had `darkMode: boolean`, defaulting to false, so a stored `false` cannot tell
 * "chose light" from "never touched it": without `themeMode` it means "follow the system".
 * Newer builds keep `darkMode === (themeMode === 'dark')` for older clients that still read it, so
 * a mismatch means an older client changed the switch since: that change wins.
 */
export function reconcileThemeMode(settings: { themeMode?: unknown; darkMode?: unknown } | null | undefined): ThemeMode {
  const dark = settings?.darkMode;
  const mode = settings?.themeMode;
  if (!THEME_MODES.includes(mode as ThemeMode)) return dark === true ? 'dark' : 'system';
  if (mode === 'dark' && dark === false) return 'light';
  if (mode !== 'dark' && dark === true) return 'dark';
  return mode as ThemeMode;
}

/** The boolean older clients read, kept consistent with the mode. */
export const legacyDarkMode = (mode: ThemeMode): boolean => mode === 'dark';

/** Both appearance fields for a settings object, consistent with each other. */
export function themeModeFields(mode: ThemeMode): { themeMode: ThemeMode; darkMode: boolean } {
  return { themeMode: mode, darkMode: legacyDarkMode(mode) };
}

/** Whether the app draws in dark colors for a mode and the system's current scheme. */
export function resolveDarkMode(mode: ThemeMode, systemScheme: string | null | undefined): boolean {
  return mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
}
