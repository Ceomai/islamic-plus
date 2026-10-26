import { DEFAULT_SETTINGS, QURAN_EDITIONS } from '../constants/defaults';
import type { AppLanguage, UserSettings } from '../types';

function editionForLegacyLanguage(code: string): string {
  const match = QURAN_EDITIONS.find((e) => e.language === code);
  return match?.id ?? DEFAULT_SETTINGS.quranEditionId;
}

export function migrateSettings(raw: unknown): UserSettings {
  const base = { ...DEFAULT_SETTINGS, ...(raw as Partial<UserSettings>) };
  const legacy = raw as { language?: string; appLanguage?: AppLanguage; quranEditionId?: string };

  const withPro = {
    ...base,
    themeId: base.themeId ?? 'emerald',
    familyModeEnabled: base.familyModeEnabled ?? false,
    activeFamilyMemberId: base.activeFamilyMemberId ?? null,
    cloudSync: base.cloudSync ?? DEFAULT_SETTINGS.cloudSync,
    widgetPrefs: base.widgetPrefs ?? DEFAULT_SETTINGS.widgetPrefs,
    customReminders: base.customReminders ?? [],
    offlineAudioEnabled: base.offlineAudioEnabled ?? true,
    homeLauncher: base.homeLauncher ?? DEFAULT_SETTINGS.homeLauncher,
    darkMode: base.darkMode ?? false,
  };

  if (legacy.appLanguage && legacy.quranEditionId) {
    return {
      ...withPro,
      appLanguage: legacy.appLanguage === 'tr' ? 'tr' : 'en',
      quranEditionId: legacy.quranEditionId,
    };
  }

  const oldLang = legacy.language ?? 'en';
  return {
    ...withPro,
    appLanguage: oldLang === 'tr' ? 'tr' : 'en',
    quranEditionId: editionForLegacyLanguage(oldLang),
  };
}
