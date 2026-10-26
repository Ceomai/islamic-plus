import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { useAuth } from './AuthContext';
import { scheduleCustomReminders } from '../services/advancedReminders';
import { initAudio } from '../services/audio';
import { buildSyncPayload, importSyncPayloadToStorage, performCloudSync, type SyncPayload } from '../services/cloudSync';
import { getCachedLocation, getCurrentLocation, type StoredLocation } from '../services/location';
import { getTodayCompletions, togglePrayerCompletion } from '../services/prayerTracking';
import {
  notifyAppDataChanged,
  registerAppDataPayloadBuilder,
  syncUserDataFromCloud,
} from '../services/userDataCloud';
import { schedulePrayerNotifications, setupNotificationChannels } from '../services/notifications';
import { migrateSettings } from '../services/settingsMigration';
import { computeHabitScore, loadStats, recordActivity } from '../services/statistics';
import { logAIChatExchange, resetAIChatSessionId, trackFeatureAction } from '../services/cloudAnalytics';
import { getJson, setJson, storageKeys } from '../services/storage';
import { loadHadithProgress, loadQuranProgress, onReadingProgressChanged } from '../services/readingProgress';
import {
  scheduleReadingProgressCloudSync,
  syncReadingProgressFromCloud,
} from '../services/readingProgressCloud';
import type {
  ActivityStats,
  AIChatMessage,
  CustomReminder,
  FamilyMember,
  HadithProgress,
  HomeFeatureId,
  PrayerCompletion,
  PrayerName,
  QuranProgress,
  SpiritualHabit,
  ThemeId,
  UserSettings,
} from '../types';

interface AppContextValue {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  location: StoredLocation | null;
  refreshLocation: () => Promise<void>;
  habits: SpiritualHabit[];
  addHabit: (habit: Omit<SpiritualHabit, 'id' | 'completedDates'>) => Promise<void>;
  toggleHabitToday: (id: string) => Promise<void>;
  family: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'habitIds'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  setActiveFamilyMember: (id: string | null) => Promise<void>;
  stats: ActivityStats;
  refreshStats: () => Promise<void>;
  trackActivity: (type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer') => Promise<void>;
  habitScore: number;
  aiMessages: AIChatMessage[];
  sendAIMessage: (text: string, reply: string) => Promise<void>;
  clearAIChat: () => Promise<void>;
  syncNow: () => Promise<{ success: boolean; mergedAt: string }>;
  exportSyncPayload: () => Promise<SyncPayload>;
  importSyncPayload: (payload: SyncPayload) => Promise<void>;
  addCustomReminder: (reminder: Omit<CustomReminder, 'id'>) => Promise<void>;
  removeCustomReminder: (id: string) => Promise<void>;
  markDuaRead: (duaId: string) => Promise<void>;
  quranProgress: QuranProgress;
  hadithProgress: HadithProgress;
  refreshReadingProgress: () => Promise<void>;
  updateHomeLauncher: (order: HomeFeatureId[]) => Promise<void>;
  todayPrayers: PrayerCompletion[];
  togglePrayerComplete: (prayer: PrayerName) => Promise<void>;
  refreshTodayPrayers: () => Promise<void>;
  loading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setThemeId: (id: ThemeId) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [location, setLocation] = useState<StoredLocation | null>(null);
  const [habits, setHabits] = useState<SpiritualHabit[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    tasbihTotal: 0,
    habitsCompletedTotal: 0,
    duasReadCount: 0,
    quranSessions: 0,
    prayerStreakDays: 0,
    lastActiveDate: '',
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  });
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [quranProgress, setQuranProgress] = useState<QuranProgress>({ lastRead: null, bookmarks: [] });
  const [hadithProgress, setHadithProgress] = useState<HadithProgress>({ lastRead: null, bookmarks: [] });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [todayPrayers, setTodayPrayers] = useState<PrayerCompletion[]>([]);

  const refreshTodayPrayers = useCallback(async () => {
    setTodayPrayers(await getTodayCompletions());
  }, []);

  // Latest state for async sync work — keeps sync callbacks stable so they don't retrigger effects
  const stateRef = useRef({ settings, habits, family, stats, darkMode, location });
  stateRef.current = { settings, habits, family, stats, darkMode, location };

  useEffect(() => {
    registerAppDataPayloadBuilder(async () => {
      const s = stateRef.current;
      return buildSyncPayload(s.settings, s.habits, s.family, s.stats, s.darkMode, s.location);
    });
    return () => registerAppDataPayloadBuilder(null);
  }, []);

  const refreshStats = useCallback(async () => {
    const s = await loadStats();
    setStats(s);
  }, []);

  useEffect(() => {
    (async () => {
      await setupNotificationChannels();
      void initAudio();
      const [rawSettings, savedHabits, cachedLoc, savedFamily, savedStats, savedChat] = await Promise.all([
        getJson(storageKeys.settings, DEFAULT_SETTINGS),
        getJson<SpiritualHabit[]>(storageKeys.habits, []),
        getCachedLocation(),
        getJson<FamilyMember[]>(storageKeys.family, []),
        loadStats(),
        getJson<AIChatMessage[]>(storageKeys.aiChat, []),
      ]);
      const savedSettings = migrateSettings(rawSettings);
      setSettings(savedSettings);
      setDarkMode(savedSettings.darkMode ?? false);
      void setJson(storageKeys.settings, savedSettings);
      setHabits(savedHabits);
      setLocation(cachedLoc);
      setFamily(savedFamily);
      setStats(savedStats);
      setAiMessages(savedChat);
      const [qp, hp] = await Promise.all([
        loadQuranProgress(savedSettings.activeFamilyMemberId),
        loadHadithProgress(savedSettings.activeFamilyMemberId),
      ]);
      setQuranProgress(qp);
      setHadithProgress(hp);
      await refreshTodayPrayers();
      if (savedSettings.customReminders.length > 0) {
        void scheduleCustomReminders(savedSettings.customReminders);
      }
      setLoading(false);
    })();
  }, []);

  const refreshReadingProgress = useCallback(async () => {
    const memberId = settings.activeFamilyMemberId;
    const [qp, hp] = await Promise.all([loadQuranProgress(memberId), loadHadithProgress(memberId)]);
    setQuranProgress(qp);
    setHadithProgress(hp);
  }, [settings.activeFamilyMemberId]);

  const syncReadingFromCloud = useCallback(async () => {
    const memberId = stateRef.current.settings.activeFamilyMemberId;
    const { quran, hadith } = await syncReadingProgressFromCloud(memberId);
    setQuranProgress(quran);
    setHadithProgress(hadith);
  }, []);

  const syncAppDataFromCloud = useCallback(async () => {
    const s = stateRef.current;
    const merged = await syncUserDataFromCloud(s.settings, s.habits, s.family, s.stats, s.darkMode, s.location);
    setSettings(merged.settings);
    setDarkMode(merged.darkMode);
    setHabits(merged.habits);
    setFamily(merged.family);
    setStats(merged.stats);
    if (merged.locationPref) {
      setLocation({
        latitude: merged.locationPref.latitude,
        longitude: merged.locationPref.longitude,
        city: merged.locationPref.city,
        country: merged.locationPref.country,
        updatedAt: merged.locationPref.updatedAt,
      });
    }
    await refreshTodayPrayers();
    await refreshStats();
  }, [refreshStats, refreshTodayPrayers]);

  // Pull from cloud once per mount (AppProvider is remounted per account), after local data has loaded
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (loading || initialSyncDone.current || !authReady || !session || session.isGuest) return;
    initialSyncDone.current = true;
    void syncAppDataFromCloud();
    void syncReadingFromCloud();
  }, [loading, authReady, session, syncAppDataFromCloud, syncReadingFromCloud]);

  // Switching family member loads that member's cloud scope
  const lastMemberId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (loading) return;
    const memberId = settings.activeFamilyMemberId;
    if (lastMemberId.current === undefined) {
      lastMemberId.current = memberId;
      return;
    }
    if (lastMemberId.current === memberId) return;
    lastMemberId.current = memberId;
    if (!session || session.isGuest) return;
    void syncReadingFromCloud();
    void syncAppDataFromCloud();
  }, [loading, settings.activeFamilyMemberId, session, syncReadingFromCloud, syncAppDataFromCloud]);

  useEffect(() => {
    return onReadingProgressChanged((memberId) => {
      if (session && !session.isGuest) {
        scheduleReadingProgressCloudSync(memberId);
      }
    });
  }, [session?.userId, session?.isGuest]);

  const refreshLocation = useCallback(async () => {
    const loc = await getCurrentLocation();
    setLocation(loc);
    if (loc) {
      await schedulePrayerNotifications(loc.latitude, loc.longitude, settings);
      notifyAppDataChanged();
    }
  }, [settings]);

  useEffect(() => {
    if (location && settings.globalNotificationsEnabled) {
      schedulePrayerNotifications(location.latitude, location.longitude, settings);
    }
  }, [location, settings]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void setJson(storageKeys.settings, next);
      if (location && next.globalNotificationsEnabled) {
        void schedulePrayerNotifications(location.latitude, location.longitude, next);
      }
      if (patch.customReminders || next.customReminders) {
        void scheduleCustomReminders(next.customReminders);
      }
      notifyAppDataChanged();
      return next;
    });
  }, [location]);

  const updateHomeLauncher = useCallback(
    async (order: HomeFeatureId[]) => {
      await updateSettings({ homeLauncher: { order } });
    },
    [updateSettings]
  );

  const addHabit = useCallback(async (habit: Omit<SpiritualHabit, 'id' | 'completedDates'>) => {
    const newHabit: SpiritualHabit = {
      ...habit,
      id: Date.now().toString(),
      completedDates: [],
    };
    setHabits((prev) => {
      const next = [...prev, newHabit];
      setJson(storageKeys.habits, next);
      notifyAppDataChanged();
      return next;
    });
  }, []);

  const toggleHabitToday = useCallback(async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setHabits((prev) => {
      const next = prev.map((h) => {
        if (h.id !== id) return h;
        const has = h.completedDates.includes(today);
        if (!has) void recordActivity('habit');
        return {
          ...h,
          completedDates: has
            ? h.completedDates.filter((d) => d !== today)
            : [...h.completedDates, today],
        };
      });
      setJson(storageKeys.habits, next);
      void refreshStats();
      notifyAppDataChanged();
      return next;
    });
  }, [refreshStats]);

  const addFamilyMember = useCallback(async (member: Omit<FamilyMember, 'id' | 'habitIds'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: Date.now().toString(),
      habitIds: [],
    };
    setFamily((prev) => {
      const next = [...prev, newMember];
      void setJson(storageKeys.family, next);
      notifyAppDataChanged();
      return next;
    });
  }, []);

  const removeFamilyMember = useCallback(async (id: string) => {
    setFamily((prev) => {
      const next = prev.filter((m) => m.id !== id);
      void setJson(storageKeys.family, next);
      notifyAppDataChanged();
      return next;
    });
    if (settings.activeFamilyMemberId === id) {
      await updateSettings({ activeFamilyMemberId: null });
    }
  }, [settings.activeFamilyMemberId, updateSettings]);

  const setActiveFamilyMember = useCallback(
    async (id: string | null) => {
      await updateSettings({ activeFamilyMemberId: id });
    },
    [updateSettings]
  );

  const trackActivity = useCallback(
    async (type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer') => {
      const next = await recordActivity(type);
      setStats(next);
      void trackFeatureAction(type, 'activity_recorded');
      notifyAppDataChanged();
    },
    []
  );

  const togglePrayerComplete = useCallback(
    async (prayer: PrayerName) => {
      const added = await togglePrayerCompletion(prayer);
      if (added) await trackActivity('prayer');
      await refreshTodayPrayers();
    },
    [trackActivity, refreshTodayPrayers]
  );

  const sendAIMessage = useCallback(async (text: string, reply: string) => {
    const now = new Date().toISOString();
    const userText = text.trim();
    const assistantText = reply.trim();

    setAiMessages((prev) => {
      const next: AIChatMessage[] = [...prev];
      if (userText) {
        next.push({ id: `${now}-u`, role: 'user', content: userText, timestamp: now });
      }
      if (assistantText) {
        next.push({ id: `${now}-a`, role: 'assistant', content: assistantText, timestamp: now });
      }
      void setJson(storageKeys.aiChat, next);
      return next;
    });

    if (userText || assistantText) {
      void logAIChatExchange(userText, assistantText);
    }
  }, []);

  const clearAIChat = useCallback(async () => {
    setAiMessages([]);
    await setJson(storageKeys.aiChat, []);
    resetAIChatSessionId();
  }, []);

  const exportSyncPayload = useCallback(async () => {
    return buildSyncPayload(settings, habits, family, stats, darkMode, location);
  }, [settings, habits, family, stats, darkMode, location]);

  const importSyncPayload = useCallback(async (payload: SyncPayload) => {
    await importSyncPayloadToStorage(payload);
    setSettings(payload.settings);
    setDarkMode(payload.darkMode);
    setHabits(payload.habits);
    setFamily(payload.family);
    setStats(payload.stats);
    if (payload.locationPref) {
      setLocation({
        latitude: payload.locationPref.latitude,
        longitude: payload.locationPref.longitude,
        city: payload.locationPref.city,
        country: payload.locationPref.country,
        updatedAt: payload.locationPref.updatedAt,
      });
    }
    await refreshTodayPrayers();
    if (payload.settings.customReminders.length > 0) {
      await scheduleCustomReminders(payload.settings.customReminders);
    }
  }, [refreshTodayPrayers]);

  const syncNow = useCallback(async () => {
    const local = await buildSyncPayload(settings, habits, family, stats, darkMode, location);
    const result = await performCloudSync(local, importSyncPayload);
    await updateSettings({
      cloudSync: { ...settings.cloudSync, lastSyncAt: result.mergedAt, syncEnabled: true },
    });
    await refreshStats();
    notifyAppDataChanged();
    return result;
  }, [settings, habits, family, stats, darkMode, location, importSyncPayload, updateSettings, refreshStats]);

  const addCustomReminder = useCallback(
    async (reminder: Omit<CustomReminder, 'id'>) => {
      const newR: CustomReminder = { ...reminder, id: Date.now().toString() };
      const next = [...settings.customReminders, newR];
      await updateSettings({ customReminders: next });
      await scheduleCustomReminders(next);
    },
    [settings.customReminders, updateSettings]
  );

  const removeCustomReminder = useCallback(
    async (id: string) => {
      const next = settings.customReminders.filter((r) => r.id !== id);
      await updateSettings({ customReminders: next });
      await scheduleCustomReminders(next);
    },
    [settings.customReminders, updateSettings]
  );

  const markDuaRead = useCallback(async (duaId: string) => {
    const progress = await getJson<Record<string, number>>(storageKeys.duaProgress, {});
    progress[duaId] = (progress[duaId] ?? 0) + 1;
    await setJson(storageKeys.duaProgress, progress);
    await trackActivity('dua');
    notifyAppDataChanged();
  }, [trackActivity]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((d) => {
      const next = !d;
      void updateSettings({ darkMode: next });
      return next;
    });
  }, [updateSettings]);

  const setThemeId = useCallback(
    async (id: ThemeId) => {
      await updateSettings({ themeId: id });
    },
    [updateSettings]
  );

  const habitScore = computeHabitScore(habits);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        location,
        refreshLocation,
        habits,
        addHabit,
        toggleHabitToday,
        family,
        addFamilyMember,
        removeFamilyMember,
        setActiveFamilyMember,
        stats,
        refreshStats,
        trackActivity,
        habitScore,
        aiMessages,
        sendAIMessage,
        clearAIChat,
        syncNow,
        exportSyncPayload,
        importSyncPayload,
        addCustomReminder,
        removeCustomReminder,
        markDuaRead,
        quranProgress,
        hadithProgress,
        refreshReadingProgress,
        updateHomeLauncher,
        todayPrayers,
        togglePrayerComplete,
        refreshTodayPrayers,
        loading,
        darkMode,
        toggleDarkMode,
        setThemeId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
