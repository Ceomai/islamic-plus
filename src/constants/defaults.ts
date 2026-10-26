import type { PrayerName, UserSettings } from '../types';
import { DEFAULT_HOME_LAUNCHER_ORDER } from './homeFeatures';

const defaultPrayerNotification = {
  enabled: true,
  sound: 'default' as const,
  vibrate: true,
  advanceMinutes: 0,
};

const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const defaultWidgetPrefs = {
  showNextPrayer: true,
  showHijriDate: true,
  showDailyDua: true,
  compactMode: false,
};

export const DEFAULT_SETTINGS: UserSettings = {
  appLanguage: 'en',
  quranEditionId: 'en.sahih',
  madhab: 'hanafi',
  calculationMethod: 'muslimWorldLeague',
  sectPreference: 'neutral',
  onboardingDone: false,
  locationReminderEnabled: true,
  globalNotificationsEnabled: true,
  prayerNotifications: prayers.reduce(
    (acc, p) => ({ ...acc, [p]: { ...defaultPrayerNotification } }),
    {} as UserSettings['prayerNotifications']
  ),
  disabledPrayerRules: [],
  themeId: 'emerald',
  familyModeEnabled: false,
  activeFamilyMemberId: null,
  cloudSync: { lastSyncAt: null, deviceId: `device-${Date.now()}`, syncEnabled: false },
  widgetPrefs: defaultWidgetPrefs,
  customReminders: [],
  offlineAudioEnabled: true,
  quranView: 'parallel',
  quranFontScale: 1,
  homeLauncher: { order: [...DEFAULT_HOME_LAUNCHER_ORDER] },
  darkMode: false,
};

export const CALCULATION_METHODS = [
  { id: 'muslimWorldLeague', label: 'Muslim World League' },
  { id: 'egyptian', label: 'Egyptian General Authority' },
  { id: 'karachi', label: 'University of Islamic Sciences, Karachi' },
  { id: 'ummAlQura', label: 'Umm al-Qura, Makkah' },
  { id: 'dubai', label: 'Dubai' },
  { id: 'moonsightingCommittee', label: 'Moonsighting Committee' },
  { id: 'northAmerica', label: 'ISNA (North America)' },
  { id: 'kuwait', label: 'Kuwait' },
  { id: 'qatar', label: 'Qatar' },
  { id: 'singapore', label: 'Singapore' },
  { id: 'tehran', label: 'Institute of Geophysics, Tehran' },
  { id: 'turkey', label: 'Diyanet (Turkey)' },
] as const;

export const MADHABS = [
  { id: 'hanafi', label: 'Hanafi' },
  { id: 'shafi', label: "Shafi'i" },
  { id: 'maliki', label: 'Maliki' },
  { id: 'hanbali', label: 'Hanbali' },
  { id: 'jafari', label: "Ja'fari" },
] as const;

export const APP_LANGUAGES = [
  { code: 'en' as const, label: 'English' },
  { code: 'tr' as const, label: 'Türkçe' },
];

/** Translations offered in the reader. Arabic text and transliteration are fixed editions below. */
export const QURAN_EDITIONS: { id: string; name: string; language: string; translator?: string }[] = [
  { id: 'tr.diyanet', name: 'Diyanet İşleri', language: 'tr' },
  { id: 'tr.yazir', name: 'Elmalılı Hamdi Yazır', language: 'tr' },
  { id: 'tr.vakfi', name: 'Diyanet Vakfı', language: 'tr' },
  { id: 'tr.ates', name: 'Süleyman Ateş', language: 'tr' },
  { id: 'en.sahih', name: 'Sahih International', language: 'en' },
  { id: 'en.asad', name: 'The Message of the Quran', language: 'en', translator: 'Muhammad Asad' },
  { id: 'en.pickthall', name: 'Pickthall', language: 'en' },
  { id: 'ur.ahmedali', name: 'Ahmed Ali', language: 'ur' },
];

export const QURAN_ARABIC_EDITION = 'quran-uthmani';
export const QURAN_TRANSLITERATION_EDITION = 'en.transliteration';
/** Mishary Alafasy recitation, addressed by global ayah number */
export const QURAN_AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';

