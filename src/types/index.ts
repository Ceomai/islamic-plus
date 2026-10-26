export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type Madhab = 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari';

export type CalculationMethodId =
  | 'muslimWorldLeague'
  | 'egyptian'
  | 'karachi'
  | 'ummAlQura'
  | 'dubai'
  | 'moonsightingCommittee'
  | 'northAmerica'
  | 'kuwait'
  | 'qatar'
  | 'singapore'
  | 'tehran'
  | 'turkey';

export type SectPreference = 'sunni' | 'shia' | 'neutral';

export type AppLanguage = 'en' | 'tr';

export type QuranView = 'translation' | 'arabic' | 'parallel' | 'study' | 'mushaf';

export type ThemeId = 'emerald' | 'midnight' | 'desert' | 'ocean' | 'rose';

export interface FamilyMember {
  id: string;
  name: string;
  avatarEmoji: string;
  role: 'parent' | 'child' | 'spouse' | 'other';
  habitIds: string[];
}

export interface CustomReminder {
  id: string;
  title: string;
  time: string; // HH:mm
  daysOfWeek: number[];
  type: 'dhikr' | 'dua' | 'quran' | 'custom';
  enabled: boolean;
  sound: 'default' | 'adhan_short' | 'silent';
}

export interface WidgetPreferences {
  showNextPrayer: boolean;
  showHijriDate: boolean;
  showDailyDua: boolean;
  compactMode: boolean;
}

export interface ActivityStats {
  tasbihTotal: number;
  habitsCompletedTotal: number;
  duasReadCount: number;
  quranSessions: number;
  prayerStreakDays: number;
  lastActiveDate: string;
  weeklyActivity: number[]; // last 7 days score 0-100, oldest first (derived from dailyPoints)
  /** Activity points per local day (YYYY-MM-DD), last 30 days */
  dailyPoints?: Record<string, number>;
}

export interface CloudSyncMeta {
  lastSyncAt: string | null;
  deviceId: string;
  syncEnabled: boolean;
}

/** A screen the assistant can open (screen name from RootStackParamList) */
export interface AssistantTarget {
  screen: string;
  params?: Record<string, unknown>;
}

export interface AssistantAction {
  label: string;
  icon?: string;
  target: AssistantTarget;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /** Buttons under an assistant reply that open a screen */
  actions?: AssistantAction[];
}

export interface AuthSession {
  userId: string;
  isGuest: boolean;
  pseudonym: string;
}

export interface StoredAuthUser {
  id: string;
  emailHash: string;
  passwordHash: string;
  salt: string;
  pseudonym: string;
  createdAt: string;
}

export interface PrayerNotificationSettings {
  enabled: boolean;
  sound: 'default' | 'adhan_short' | 'adhan_full' | 'silent';
  vibrate: boolean;
  advanceMinutes: number;
}

export interface PrayerSchedule {
  date: string;
  times: Record<PrayerName, string>;
}

export interface DisabledPrayerRule {
  prayer: PrayerName;
  daysOfWeek: number[];
  specificDates: string[];
}

export interface UserSettings {
  appLanguage: AppLanguage;
  quranEditionId: string;
  madhab: Madhab;
  calculationMethod: CalculationMethodId;
  sectPreference: SectPreference;
  locationReminderEnabled: boolean;
  prayerNotifications: Record<PrayerName, PrayerNotificationSettings>;
  disabledPrayerRules: DisabledPrayerRule[];
  globalNotificationsEnabled: boolean;
  themeId: ThemeId;
  familyModeEnabled: boolean;
  activeFamilyMemberId: string | null;
  cloudSync: CloudSyncMeta;
  widgetPrefs: WidgetPreferences;
  customReminders: CustomReminder[];
  offlineAudioEnabled: boolean;
  /** How the Quran reader lays out ayahs */
  quranView: QuranView;
  /** Multiplier for Quran text size (0.85–1.6) */
  quranFontScale: number;
  homeLauncher: HomeLauncherLayout;
  darkMode: boolean;
}

export type HomeFeatureId =
  | 'module_prayer_times'
  | 'module_widget'
  | 'quran'
  | 'hadith'
  | 'duas'
  | 'qibla'
  | 'tasbih'
  | 'calendar'
  | 'education'
  | 'habits'
  | 'duties'
  | 'places_mosque'
  | 'places_halal'
  | 'notifications'
  | 'advanced_reminders'
  | 'ai_assistant'
  | 'statistics'
  | 'family_mode'
  | 'themes'
  | 'cloud_sync'
  | 'widgets'
  | 'settings';

export interface HomeLauncherLayout {
  order: HomeFeatureId[];
}

export interface QuranLastRead {
  surahNumber: number;
  surahName: string;
  edition: string;
  ayahNumber: number;
  updatedAt: string;
}

export interface QuranBookmark {
  id: string;
  surahNumber: number;
  surahName: string;
  edition: string;
  ayahNumber: number;
  label: string;
  createdAt: string;
}

export interface QuranProgress {
  lastRead: QuranLastRead | null;
  bookmarks: QuranBookmark[];
  /** Local/cloud merge timestamp */
  updatedAt?: string;
}

export interface HadithLastRead {
  collectionId: string;
  collectionName: string;
  itemIndex: number;
  updatedAt: string;
}

export interface HadithBookmark {
  id: string;
  collectionId: string;
  collectionName: string;
  itemIndex: number;
  label: string;
  createdAt: string;
}

export interface HadithProgress {
  lastRead: HadithLastRead | null;
  bookmarks: HadithBookmark[];
  /** Local/cloud merge timestamp */
  updatedAt?: string;
}

export interface PrayerCompletion {
  id: string;
  prayer: PrayerName;
  date: string;
  completedAt: string;
}

export interface TasbihSession {
  id: string;
  count: number;
  target: number;
  completedAt: string;
  /** Which dhikr was recited (see src/data/dhikr.ts); missing on sessions saved by older builds */
  dhikrId?: string;
}

export interface TasbihData {
  /** Count of the round in progress */
  count: number;
  /** Lifetime count across all rounds */
  total: number;
  /** Completed (or reset) rounds, newest first */
  sessions: TasbihSession[];
  /** Counts per local day (YYYY-MM-DD) and hour of day (24 slots), last 90 days */
  log?: Record<string, number[]>;
}

export interface EducationProgressEntry {
  topicId: string;
  readCount: number;
  lastOpenedAt: string;
}

export interface ZakatCalculationRecord {
  id: string;
  calculatedAt: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  isObligatory: boolean;
}

export interface LocationPref {
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface SpiritualHabit {
  id: string;
  title: string;
  targetPerWeek: number;
  completedDates: string[];
  category: 'prayer' | 'quran' | 'dhikr' | 'charity' | 'fasting' | 'other';
}

export interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  type: 'mosque' | 'prayer_room' | 'halal_restaurant';
  /** Where the data came from, for attribution */
  source?: 'google' | 'osm';
}

export interface EducationTopic {
  id: string;
  title: string;
  summary: string;
  perspectives: {
    sect: string;
    approach: string;
  }[];
}

export interface QuranEdition {
  id: string;
  name: string;
  language: string;
  translator?: string;
  sect?: SectPreference;
}

export interface HadithCollection {
  id: string;
  name: string;
  language: string;
  sect?: SectPreference;
}
