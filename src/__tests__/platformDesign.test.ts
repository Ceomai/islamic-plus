import { describe, expect, it, jest } from '@jest/globals';
import { Alert, Platform } from 'react-native';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { mergeSyncPayloads, type SyncPayload } from '../services/cloudSync';
import { migrateSettings } from '../services/settingsMigration';
import { legacyDarkMode, reconcileThemeMode, resolveDarkMode } from '../services/themeMode';
import { launcherColumns } from '../theme/tokens';
import type { UserSettings } from '../types';
import { confirm, confirmDestructive } from '../utils/confirm';

jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

describe('themeMode migration', () => {
  it('maps a legacy darkMode=true to dark and an unknown false to system', () => {
    expect(reconcileThemeMode({ darkMode: true })).toBe('dark');
    // false was the default, so it does not prove the user chose light
    expect(reconcileThemeMode({ darkMode: false })).toBe('system');
    expect(reconcileThemeMode({})).toBe('system');
    expect(reconcileThemeMode(null)).toBe('system');
  });

  it('keeps a stored themeMode when darkMode agrees with it', () => {
    expect(reconcileThemeMode({ themeMode: 'light', darkMode: false })).toBe('light');
    expect(reconcileThemeMode({ themeMode: 'system', darkMode: false })).toBe('system');
    expect(reconcileThemeMode({ themeMode: 'dark', darkMode: true })).toBe('dark');
    expect(reconcileThemeMode({ themeMode: 'sepia', darkMode: false })).toBe('system');
  });

  it('lets a change made by an older client win over themeMode', () => {
    expect(reconcileThemeMode({ themeMode: 'dark', darkMode: false })).toBe('light');
    expect(reconcileThemeMode({ themeMode: 'system', darkMode: true })).toBe('dark');
    expect(reconcileThemeMode({ themeMode: 'light', darkMode: true })).toBe('dark');
  });

  it('migrateSettings fills themeMode and keeps darkMode as its legacy mirror', () => {
    expect(migrateSettings({ darkMode: true })).toMatchObject({ themeMode: 'dark', darkMode: true });
    expect(migrateSettings({ darkMode: false })).toMatchObject({ themeMode: 'system', darkMode: false });
    expect(migrateSettings({ themeMode: 'light', darkMode: false })).toMatchObject({ themeMode: 'light', darkMode: false });
    expect(migrateSettings(null)).toMatchObject({ themeMode: 'system', darkMode: false });
  });

  it('resolves the drawn appearance from mode and system scheme', () => {
    expect(resolveDarkMode('system', 'dark')).toBe(true);
    expect(resolveDarkMode('system', 'light')).toBe(false);
    expect(resolveDarkMode('system', null)).toBe(false);
    expect(resolveDarkMode('light', 'dark')).toBe(false);
    expect(resolveDarkMode('dark', 'light')).toBe(true);
    expect(legacyDarkMode('system')).toBe(false);
    expect(legacyDarkMode('dark')).toBe(true);
  });
});

function payload(settings: Partial<UserSettings>, updatedAt: string, darkMode = false): SyncPayload {
  return {
    version: 2,
    exportedAt: updatedAt,
    profileScope: 'default',
    darkMode,
    settings: { ...DEFAULT_SETTINGS, ...settings, updatedAt },
    habits: [],
    family: [],
    stats: { tasbihTotal: 0, habitsCompletedTotal: 0, duasReadCount: 0, quranSessions: 0, prayerStreakDays: 0, lastActiveDate: '', weeklyActivity: [0, 0, 0, 0, 0, 0, 0] },
    tasbih: { count: 0, total: 0, sessions: [] },
    duaProgress: {},
    prayerCompletions: [],
    educationProgress: [],
    zakatHistory: [],
    locationPref: null,
  };
}

/** Settings as an older build stores them: no themeMode field at all */
function legacyPayload(darkMode: boolean, updatedAt: string): SyncPayload {
  const p = payload({ darkMode }, updatedAt, darkMode);
  delete (p.settings as Partial<UserSettings>).themeMode;
  return p;
}

describe('themeMode sync compatibility', () => {
  it('writes darkMode for older clients alongside themeMode', () => {
    const local = payload({ themeMode: 'dark', darkMode: true }, '2026-01-02');
    const remote = payload({ themeMode: 'system', darkMode: false }, '2026-01-01');
    const merged = mergeSyncPayloads(remote, local);
    expect(merged.settings.themeMode).toBe('dark');
    expect(merged.settings.darkMode).toBe(true);
    expect(merged.darkMode).toBe(true);
  });

  it('applies a newer change from an older client that only knows darkMode', () => {
    const local = payload({ themeMode: 'dark', darkMode: true }, '2026-01-01', true);
    // The old client switched dark mode off later; its settings still carry our themeMode field
    const remote = payload({ themeMode: 'dark', darkMode: false }, '2026-01-02', false);
    const merged = mergeSyncPayloads(remote, local);
    expect(merged.settings.themeMode).toBe('light');
    expect(merged.darkMode).toBe(false);
  });

  it('reads a payload written only by an older client', () => {
    const local = payload({ themeMode: 'system', darkMode: false }, '2026-01-01');
    const merged = mergeSyncPayloads(legacyPayload(true, '2026-01-02'), local);
    expect(merged.settings).toMatchObject({ themeMode: 'dark', darkMode: true });
  });
});

describe('launcherColumns', () => {
  it('uses 4 columns on phones, 6 on tablets and 8 on wide windows', () => {
    expect(launcherColumns(375)).toBe(4);
    expect(launcherColumns(699)).toBe(4);
    expect(launcherColumns(700)).toBe(6);
    expect(launcherColumns(999)).toBe(6);
    expect(launcherColumns(1000)).toBe(8);
    expect(launcherColumns(1366)).toBe(8);
  });
});

describe('confirm helper', () => {
  const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
  const opts = { title: 'Delete?', message: 'Gone for good', confirm: 'Delete', cancel: 'Cancel' };

  it('uses window.confirm on web, where Alert.alert does nothing', async () => {
    const original = Platform.OS;
    const g = globalThis as unknown as { window?: { confirm: (m: string) => boolean } };
    const previous = g.window;
    const webConfirm = jest.fn((_message: string) => true);
    g.window = Object.assign(Object.create(previous ?? null) ?? {}, { confirm: webConfirm });
    setOS('web');
    try {
      await expect(confirm(opts)).resolves.toBe(true);
      expect(webConfirm).toHaveBeenCalledWith('Delete?\n\nGone for good');
      webConfirm.mockReturnValueOnce(false);
      await expect(confirmDestructive(opts)).resolves.toBe(false);
    } finally {
      setOS(original);
      g.window = previous;
    }
  });

  it('shows the system dialog on the phone, destructive style only for confirmDestructive', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    try {
      await expect(confirm(opts)).resolves.toBe(true);
      expect(alert.mock.calls[0][2]?.[1]?.style).toBe('default');
      await expect(confirmDestructive(opts)).resolves.toBe(true);
      expect(alert.mock.calls[1][2]?.[1]?.style).toBe('destructive');
    } finally {
      alert.mockRestore();
    }
  });
});
