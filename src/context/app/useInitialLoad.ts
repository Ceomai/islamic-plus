import { useEffect } from 'react';
import { DEFAULT_SETTINGS } from '../../constants/defaults';
import { scheduleCustomReminders } from '../../services/advancedReminders';
import { initAudio } from '../../services/audio';
import { logError } from '../../services/errorLog';
import { fireAndForget } from '../../services/fireAndForget';
import { getCachedLocation, type StoredLocation } from '../../services/location';
import { setupNotificationChannels } from '../../services/notifications';
import { migrateSettings } from '../../services/settingsMigration';
import { loadStats } from '../../services/statistics';
import { getJson, setJson, storageKeys } from '../../services/storage';
import type { ActivityStats, AIChatMessage, AppLanguage, AuthSession, FamilyMember, SpiritualHabit, UserSettings } from '../../types';

interface Setters {
  setSettings: (s: UserSettings) => void;
  setHabits: (h: SpiritualHabit[]) => void;
  setLocation: (l: StoredLocation | null) => void;
  setFamily: (f: FamilyMember[]) => void;
  setStats: (s: ActivityStats) => void;
  setAiMessages: (m: AIChatMessage[]) => void;
  loadReadingProgress: (memberId: string | null) => Promise<void>;
  refreshTodayPrayers: () => Promise<void>;
}

/** Settings for this device: stored ones, or defaults in the language last chosen on this device. */
function startupSettings(stored: UserSettings | null, deviceLanguage: AppLanguage | null, signedIn: boolean): UserSettings {
  // Settings saved before the introduction existed belong to people who are past it
  const base = stored
    ? { ...stored, onboardingDone: stored.onboardingDone ?? true }
    : {
        ...DEFAULT_SETTINGS,
        appLanguage: deviceLanguage ?? DEFAULT_SETTINGS.appLanguage,
        quranEditionId: deviceLanguage === 'tr' ? 'tr.yazir' : DEFAULT_SETTINGS.quranEditionId,
        calculationMethod: deviceLanguage === 'tr' ? 'turkey' : DEFAULT_SETTINGS.calculationMethod,
      };
  // New accounts and the sign-in screen start in the language last chosen on this device
  return migrateSettings(!signedIn && deviceLanguage ? { ...base, appLanguage: deviceLanguage } : base);
}

/** Reads the stored app data once at start-up, then calls `setLoading(false)`. */
export function useInitialLoad(session: AuthSession | null, setLoading: (loading: boolean) => void, s: Setters): void {
  useEffect(() => {
    // Channels only matter once something is scheduled; start-up must not wait for them
    fireAndForget(setupNotificationChannels(), 'startup.channels');
    (async () => {
      fireAndForget(initAudio(), 'startup.audio');
      const [storedSettings, deviceLanguage, savedHabits, cachedLoc, savedFamily, savedStats, savedChat] = await Promise.all([
        getJson<UserSettings | null>(storageKeys.settings, null),
        getJson<AppLanguage | null>(storageKeys.deviceLanguage, null),
        getJson<SpiritualHabit[]>(storageKeys.habits, []),
        getCachedLocation(),
        getJson<FamilyMember[]>(storageKeys.family, []),
        loadStats(),
        getJson<AIChatMessage[]>(storageKeys.aiChat, []),
      ]);
      const savedSettings = startupSettings(storedSettings, deviceLanguage, !!session);
      if (storedSettings && session) fireAndForget(setJson(storageKeys.deviceLanguage, savedSettings.appLanguage), 'startup.deviceLanguage');
      s.setSettings(savedSettings);
      fireAndForget(setJson(storageKeys.settings, savedSettings), 'startup.settings');
      s.setHabits(savedHabits);
      s.setLocation(cachedLoc);
      s.setFamily(savedFamily);
      s.setStats(savedStats);
      s.setAiMessages(savedChat);
      await s.loadReadingProgress(savedSettings.activeFamilyMemberId);
      await s.refreshTodayPrayers();
      if (savedSettings.customReminders.length > 0) {
        fireAndForget(scheduleCustomReminders(savedSettings.customReminders, savedSettings.appLanguage), 'startup.reminders');
      }
    })()
      // Whatever fails here, the app must leave the loading screen (with defaults if need be)
      .catch((e) => logError(e, 'promise'))
      .finally(() => setLoading(false));
    // Runs once per mount (AppProvider is remounted per account) with the session it started with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
