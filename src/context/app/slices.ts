import { createContext, useContext } from 'react';
import type { City } from '../../data/cities';
import type { SyncPayload } from '../../services/cloudSync';
import type { StoredLocation } from '../../services/location';
import type {
  ActivityStats,
  AIChatMessage,
  AppLanguage,
  AssistantAction,
  CustomReminder,
  FamilyMember,
  HadithProgress,
  HomeFeatureId,
  PrayerCompletion,
  PrayerName,
  QuranProgress,
  SpiritualHabit,
  ThemeId,
  ThemeMode,
  UserSettings,
} from '../../types';

/**
 * App state is published in slices, one context each, so a screen re-renders only when a slice it
 * reads changes (a tasbih tap no longer re-renders every screen through the stats).
 */

export type ActivityType = 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer';

export interface SettingsSlice {
  settings: UserSettings;
  /** Stored data is still being read at start-up */
  loading: boolean;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  updateHomeLauncher: (order: HomeFeatureId[]) => Promise<void>;
  addCustomReminder: (reminder: Omit<CustomReminder, 'id'>) => Promise<void>;
  removeCustomReminder: (id: string) => Promise<void>;
}

export interface AppearanceSlice {
  /** Resolved appearance: themeMode applied to the system color scheme */
  darkMode: boolean;
  themeMode: ThemeMode;
  themeId: ThemeId;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setThemeId: (id: ThemeId) => Promise<void>;
}

export interface LocationSlice {
  location: StoredLocation | null;
  /** Asks for the phone's location; false when it could not be read (refused, no fix) */
  refreshLocation: () => Promise<boolean>;
  /** Uses a city chosen from the list instead of GPS */
  setManualLocation: (city: City) => Promise<void>;
}

export interface PrayerDaySlice {
  todayPrayers: PrayerCompletion[];
  togglePrayerComplete: (prayer: PrayerName) => Promise<void>;
  refreshTodayPrayers: () => Promise<void>;
}

export interface StatsSlice {
  stats: ActivityStats;
  refreshStats: () => Promise<void>;
}

/** Stable callbacks only: screens that record activity do not re-render when the stats change */
export interface ActivitySlice {
  /** `report: false` records locally without an analytics event (e.g. every single tasbih tap) */
  /** `day` (YYYY-MM-DD) puts the points on that day instead of today */
  trackActivity: (type: ActivityType, report?: boolean, day?: string) => Promise<void>;
  markDuaRead: (duaId: string) => Promise<void>;
}

export interface HabitsSlice {
  habits: SpiritualHabit[];
  habitScore: number;
  addHabit: (habit: Omit<SpiritualHabit, 'id' | 'completedDates'>) => Promise<void>;
  toggleHabitToday: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
}

export interface FamilySlice {
  family: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'habitIds'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  setActiveFamilyMember: (id: string | null) => Promise<void>;
}

export interface ReadingSlice {
  quranProgress: QuranProgress;
  hadithProgress: HadithProgress;
  refreshReadingProgress: () => Promise<void>;
}

export interface AIChatSlice {
  aiMessages: AIChatMessage[];
  sendAIMessage: (text: string, reply: string, actions?: AssistantAction[]) => Promise<void>;
  clearAIChat: () => Promise<void>;
}

export interface SyncSlice {
  syncNow: () => Promise<{ success: boolean; mergedAt: string }>;
  exportSyncPayload: () => Promise<SyncPayload>;
  importSyncPayload: (payload: SyncPayload) => Promise<void>;
}

function createSlice<T>(name: string) {
  const Context = createContext<T | null>(null);
  Context.displayName = name;
  const useSlice = (): T => {
    const value = useContext(Context);
    if (value === null) throw new Error(`${name} must be used within AppProvider`);
    return value;
  };
  return [Context.Provider, useSlice] as const;
}

export const [SettingsProvider, useSettings] = createSlice<SettingsSlice>('Settings');
export const [AppearanceProvider, useAppearance] = createSlice<AppearanceSlice>('Appearance');
/** Only the app language, for translations: other settings changes do not reach its readers */
export const [LanguageProvider, useAppLanguage] = createSlice<AppLanguage>('Language');
export const [LocationProvider, useAppLocation] = createSlice<LocationSlice>('Location');
export const [PrayerDayProvider, usePrayerDay] = createSlice<PrayerDaySlice>('PrayerDay');
export const [StatsProvider, useStats] = createSlice<StatsSlice>('Stats');
export const [ActivityProvider, useActivity] = createSlice<ActivitySlice>('Activity');
export const [HabitsProvider, useHabits] = createSlice<HabitsSlice>('Habits');
export const [FamilyProvider, useFamily] = createSlice<FamilySlice>('Family');
export const [ReadingProvider, useReading] = createSlice<ReadingSlice>('Reading');
export const [AIChatProvider, useAIChat] = createSlice<AIChatSlice>('AIChat');
export const [SyncProvider, useSync] = createSlice<SyncSlice>('Sync');
