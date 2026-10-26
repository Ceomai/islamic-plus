import type { PrayerName, UserSettings } from '../types';
import { DEFAULT_HOME_LAUNCHER_ORDER } from './homeFeatures';

const defaultPrayerNotification = {
  enabled: true,
  sound: 'adhan_short' as const,
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

export const QURAN_EDITIONS = [
  { id: 'en.asad', name: 'The Message of the Quran', language: 'en', translator: 'Muhammad Asad' },
  { id: 'en.sahih', name: 'Sahih International', language: 'en' },
  { id: 'en.pickthall', name: 'Pickthall', language: 'en' },
  { id: 'ar.alafasy', name: 'Arabic (Uthmani)', language: 'ar' },
  { id: 'tr.yazir', name: 'Elmalılı Hamdi Yazır', language: 'tr' },
  { id: 'ur.ahmedali', name: 'Ahmed Ali', language: 'ur' },
];

export const HADITH_COLLECTIONS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari', language: 'en', sect: 'sunni' as const },
  { id: 'muslim', name: 'Sahih Muslim', language: 'en', sect: 'sunni' as const },
  { id: 'abudawud', name: 'Sunan Abu Dawud', language: 'en', sect: 'sunni' as const },
  { id: 'tirmidhi', name: "Jami' at-Tirmidhi", language: 'en', sect: 'sunni' as const },
  { id: 'nahj', name: 'Nahj al-Balagha (excerpts)', language: 'en', sect: 'shia' as const },
];
