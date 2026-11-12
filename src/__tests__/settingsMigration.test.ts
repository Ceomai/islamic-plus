import { describe, expect, it } from '@jest/globals';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { migrateSettings } from '../services/settingsMigration';
import { computeHabitScore } from '../services/statistics';
import type { SpiritualHabit } from '../types';
import { addDays, localDateKey } from '../utils/date';

/** Settings JSON as older app versions stored it (and as their cloud copies still arrive) */
const FIXTURES = {
  // Before themeMode: only the darkMode switch, the old single "language" field and the widget editor
  v1: {
    language: 'tr',
    madhab: 'hanafi',
    calculationMethod: 'turkey',
    darkMode: true,
    onboardingDone: true,
    widgetPrefs: { showNextPrayer: true, showHijriDate: false, showDailyDua: true, compactMode: true },
  },
  // App language and Quran edition split, Arabic audio stored as the "translation"
  v2: {
    appLanguage: 'en',
    quranEditionId: 'ar.alafasy',
    darkMode: false,
    widgetPrefs: { showNextPrayer: false, showHijriDate: false, showDailyDua: false, compactMode: false },
  },
  // Current shape
  v3: { ...DEFAULT_SETTINGS, appLanguage: 'tr', quranEditionId: 'tr.diyanet', themeMode: 'light', darkMode: false },
};

describe('migrateSettings with stored JSON from older versions', () => {
  it('reads a pre-themeMode dark setting as an explicit dark choice', () => {
    expect(migrateSettings(FIXTURES.v1)).toMatchObject({ themeMode: 'dark', darkMode: true });
  });

  it('keeps the old single language and its matching Quran translation', () => {
    expect(migrateSettings(FIXTURES.v1)).toMatchObject({ appLanguage: 'tr', quranEditionId: 'tr.diyanet', madhab: 'hanafi', calculationMethod: 'turkey' });
  });

  it('drops the removed widget preferences', () => {
    expect(migrateSettings(FIXTURES.v1)).not.toHaveProperty('widgetPrefs');
    expect(migrateSettings(FIXTURES.v2)).not.toHaveProperty('widgetPrefs');
  });

  it('turns an Arabic audio edition into a translation and the Arabic reader view', () => {
    expect(migrateSettings(FIXTURES.v2)).toMatchObject({ appLanguage: 'en', quranEditionId: DEFAULT_SETTINGS.quranEditionId, quranView: 'arabic' });
  });

  it('fills every missing field with its default', () => {
    const migrated = migrateSettings({ appLanguage: 'en', quranEditionId: 'en.sahih' });
    expect(migrated).toEqual({ ...DEFAULT_SETTINGS, themeMode: 'system', darkMode: false });
    for (const key of Object.keys(DEFAULT_SETTINGS)) expect(migrated).toHaveProperty(key);
  });

  it('leaves current settings as they are', () => {
    expect(migrateSettings(FIXTURES.v3)).toEqual(FIXTURES.v3);
  });

  it('clamps an out-of-range Quran text size', () => {
    expect(migrateSettings({ ...FIXTURES.v3, quranFontScale: 3 }).quranFontScale).toBe(1.6);
    expect(migrateSettings({ ...FIXTURES.v3, quranFontScale: 0.2 }).quranFontScale).toBe(0.85);
  });
});

describe('computeHabitScore', () => {
  const day = (offset: number) => localDateKey(addDays(new Date(), -offset));
  const habit = (targetPerWeek: number, completedDates: string[]): SpiritualHabit => ({
    id: String(targetPerWeek) + completedDates.join(),
    title: 'h',
    targetPerWeek,
    completedDates,
    category: 'dhikr',
  });

  it('is 0 without habits', () => {
    expect(computeHabitScore([])).toBe(0);
  });

  it('counts only the last seven days, today included', () => {
    expect(computeHabitScore([habit(7, [day(0), day(6), day(7), day(30)])])).toBe(29); // 2 of 7
  });

  it('caps each habit at its weekly target', () => {
    expect(computeHabitScore([habit(2, [day(0), day(1), day(2), day(3)])])).toBe(100);
  });

  it('weights habits by their targets', () => {
    // 3 of 3 and 0 of 7: 3 of 10
    expect(computeHabitScore([habit(3, [day(0), day(1), day(2)]), habit(7, [])])).toBe(30);
  });

  it('is 0 when every target is 0', () => {
    expect(computeHabitScore([habit(0, [day(0)])])).toBe(0);
  });
});
