import { useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_SETTINGS } from '../../constants/defaults';
import { useRefState } from '../../hooks/useRefState';
import { scheduleCustomReminders } from '../../services/advancedReminders';
import { fireAndForget } from '../../services/fireAndForget';
import { setJson, storageKeys } from '../../services/storage';
import { resolveDarkMode, themeModeFields } from '../../services/themeMode';
import { notifyAppDataChanged } from '../../services/userDataCloud';
import type { CustomReminder, HomeFeatureId, ThemeId, ThemeMode, UserSettings } from '../../types';
import type { AppearanceSlice, SettingsSlice } from './slices';

/** Settings with their actions, and the appearance derived from them. */
export function useSettingsState(loading: boolean) {
  const [settings, setSettings, settingsRef] = useRefState<UserSettings>(DEFAULT_SETTINGS);
  const systemScheme = useColorScheme();

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      // Sync bookkeeping is not a user change, so it must not make this device's settings "newer"
      const userChange = Object.keys(patch).some((k) => k !== 'cloudSync');
      const next = setSettings((prev) => ({ ...prev, ...patch, ...(userChange ? { updatedAt: new Date().toISOString() } : {}) }));
      await setJson(storageKeys.settings, next);
      if (patch.appLanguage) fireAndForget(setJson(storageKeys.deviceLanguage, patch.appLanguage), 'settings.deviceLanguage');
      // Prayer notifications are rescheduled by the location/settings effect; only reminders here
      if (patch.customReminders || patch.appLanguage) {
        fireAndForget(scheduleCustomReminders(next.customReminders, next.appLanguage), 'settings.reminders');
      }
      notifyAppDataChanged();
    },
    [setSettings]
  );

  const updateHomeLauncher = useCallback((order: HomeFeatureId[]) => updateSettings({ homeLauncher: { order } }), [updateSettings]);

  const addCustomReminder = useCallback(
    (reminder: Omit<CustomReminder, 'id'>) =>
      updateSettings({ customReminders: [...settingsRef.current.customReminders, { ...reminder, id: Date.now().toString() }] }),
    [updateSettings, settingsRef]
  );

  const removeCustomReminder = useCallback(
    (id: string) => updateSettings({ customReminders: settingsRef.current.customReminders.filter((r) => r.id !== id) }),
    [updateSettings, settingsRef]
  );

  const setThemeMode = useCallback((mode: ThemeMode) => updateSettings(themeModeFields(mode)), [updateSettings]);
  const setThemeId = useCallback((id: ThemeId) => updateSettings({ themeId: id }), [updateSettings]);

  const settingsValue = useMemo<SettingsSlice>(
    () => ({ settings, loading, updateSettings, updateHomeLauncher, addCustomReminder, removeCustomReminder }),
    [settings, loading, updateSettings, updateHomeLauncher, addCustomReminder, removeCustomReminder]
  );

  const darkMode = resolveDarkMode(settings.themeMode, systemScheme);
  const appearanceValue = useMemo<AppearanceSlice>(
    () => ({ darkMode, themeMode: settings.themeMode, themeId: settings.themeId, setThemeMode, setThemeId }),
    [darkMode, settings.themeMode, settings.themeId, setThemeMode, setThemeId]
  );

  return { settings, setSettings, settingsRef, updateSettings, settingsValue, appearanceValue };
}
