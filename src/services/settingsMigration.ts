import { DEFAULT_SETTINGS, QURAN_EDITIONS } from '../constants/defaults';
import type { AppLanguage, QuranView, UserSettings } from '../types';

function editionForLegacyLanguage(code: string): string {
  const match = QURAN_EDITIONS.find((e) => e.language === code);
  return match?.id ?? DEFAULT_SETTINGS.quranEditionId;
}

const QURAN_VIEWS: QuranView[] = ['translation', 'arabic', 'parallel', 'study', 'mushaf'];

/**
 * Older builds stored an Arabic *audio* edition (ar.alafasy) as the "translation".
 * Arabic text is now a reader view, so pick a real translation and open in Arabic view instead.
 */
function normalizeQuranChoice(
  editionId: string,
  view: QuranView | undefined,
  lang: AppLanguage
): { quranEditionId: string; quranView: QuranView } {
  const knownTranslation = QURAN_EDITIONS.some((e) => e.id === editionId);
  if (!knownTranslation) {
    return {
      quranEditionId: lang === 'tr' ? 'tr.diyanet' : DEFAULT_SETTINGS.quranEditionId,
      quranView: editionId.startsWith('ar.') ? 'arabic' : view ?? DEFAULT_SETTINGS.quranView,
    };
  }
  return { quranEditionId: editionId, quranView: view && QURAN_VIEWS.includes(view) ? view : DEFAULT_SETTINGS.quranView };
}

export function migrateSettings(raw: unknown): UserSettings {
  const base = { ...DEFAULT_SETTINGS, ...(raw as Partial<UserSettings>) };
  const legacy = raw as { language?: string; appLanguage?: AppLanguage; quranEditionId?: string; quranView?: QuranView };

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
    quranFontScale:
      typeof base.quranFontScale === 'number' ? Math.min(1.6, Math.max(0.85, base.quranFontScale)) : DEFAULT_SETTINGS.quranFontScale,
  };

  if (legacy?.appLanguage && legacy.quranEditionId) {
    const appLanguage: AppLanguage = legacy.appLanguage === 'tr' ? 'tr' : 'en';
    return {
      ...withPro,
      appLanguage,
      ...normalizeQuranChoice(legacy.quranEditionId, legacy.quranView, appLanguage),
    };
  }

  const oldLang = legacy?.language ?? 'en';
  const appLanguage: AppLanguage = oldLang === 'tr' ? 'tr' : 'en';
  return {
    ...withPro,
    appLanguage,
    ...normalizeQuranChoice(editionForLegacyLanguage(oldLang), legacy?.quranView, appLanguage),
  };
}
