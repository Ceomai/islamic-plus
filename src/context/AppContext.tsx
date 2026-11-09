import { localDateKey } from '../utils/date';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { updatePrayerWidget, type WidgetInput } from '../services/homeWidget';
import { registerWidgetTask, saveWidgetInput } from '../services/widgetBackground';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { useAuth } from './AuthContext';
import { scheduleCustomReminders } from '../services/advancedReminders';
import { initAudio } from '../services/audio';
import { buildSyncPayload, importSyncPayloadToStorage, type SyncPayload } from '../services/cloudSync';
import { isCloudUserActive } from '../services/cloudUser';
import { getCachedLocation, getCurrentLocation, type StoredLocation } from '../services/location';
import type { City } from '../data/cities';
import { recordDeletion } from '../services/tombstones';
import { getTodayCompletions, loadPrayerCompletions, markPrayerCompleted, togglePrayerCompletion } from '../services/prayerTracking';
import { ackPendingPrayerMarks, handlePrayerResponse, peekPendingPrayerMarks } from '../services/prayerAction';
import * as Notifications from 'expo-notifications';
import {
  notifyAppDataChanged,
  registerAppDataPayloadBuilder,
  syncUserDataFromCloud,
} from '../services/userDataCloud';
import { schedulePrayerNotifications, setupNotificationChannels } from '../services/notifications';
import { prayerScheduleKey } from '../services/prayerScheduleKey';
import { logError } from '../services/errorLog';
import { migrateSettings } from '../services/settingsMigration';
import { computeHabitScore, loadStats, recordActivity, updatePrayerStreak } from '../services/statistics';
import { logAIChatExchange, resetAIChatSessionId, trackFeatureAction } from '../services/cloudAnalytics';
import { getJson, getStorageUser, setJson, storageKeys } from '../services/storage';
import { loadHadithProgress, loadQuranProgress, onReadingProgressChanged } from '../services/readingProgress';
import {
  scheduleReadingProgressCloudSync,
  syncReadingProgressFromCloud,
} from '../services/readingProgressCloud';
import type {
  ActivityStats,
  AIChatMessage,
  AssistantAction,
  AppLanguage,
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
  /** Asks for the phone's location; false when it could not be read (refused, no fix) */
  refreshLocation: () => Promise<boolean>;
  /** Uses a city chosen from the list instead of GPS */
  setManualLocation: (city: City) => Promise<void>;
  habits: SpiritualHabit[];
  addHabit: (habit: Omit<SpiritualHabit, 'id' | 'completedDates'>) => Promise<void>;
  toggleHabitToday: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  family: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'habitIds'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  setActiveFamilyMember: (id: string | null) => Promise<void>;
  stats: ActivityStats;
  refreshStats: () => Promise<void>;
  /** `report: false` records locally without an analytics event (e.g. every single tasbih tap) */
  /** `day` (YYYY-MM-DD) puts the points on that day instead of today */
  trackActivity: (type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer', report?: boolean, day?: string) => Promise<void>;
  habitScore: number;
  aiMessages: AIChatMessage[];
  sendAIMessage: (text: string, reply: string, actions?: AssistantAction[]) => Promise<void>;
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

/** Messages kept in the assistant chat (oldest dropped first) */
const AI_CHAT_MAX = 200;
/** Settings changes often come in bursts (a slider, several toggles) */
const SCHEDULE_DEBOUNCE_MS = 400;

const widgetInput = (loc: StoredLocation, s: UserSettings): WidgetInput => ({
  latitude: loc.latitude,
  longitude: loc.longitude,
  city: loc.city,
  method: s.calculationMethod,
  madhab: s.madhab,
  lang: s.appLanguage,
});

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
    // Channels only matter once something is scheduled; start-up must not wait for them
    void setupNotificationChannels().catch((e) => logError(e, 'promise'));
    (async () => {
      void initAudio();
      const [storedSettings, deviceLanguage, savedHabits, cachedLoc, savedFamily, savedStats, savedChat] = await Promise.all([
        getJson<UserSettings | null>(storageKeys.settings, null),
        getJson<AppLanguage | null>(storageKeys.deviceLanguage, null),
        getJson<SpiritualHabit[]>(storageKeys.habits, []),
        getCachedLocation(),
        getJson<FamilyMember[]>(storageKeys.family, []),
        loadStats(),
        getJson<AIChatMessage[]>(storageKeys.aiChat, []),
      ]);
      // New accounts and the sign-in screen start in the language last chosen on this device
      // Settings saved before the introduction existed belong to people who are past it
      const baseSettings = storedSettings
        ? { ...storedSettings, onboardingDone: storedSettings.onboardingDone ?? true }
        : {
        ...DEFAULT_SETTINGS,
        appLanguage: deviceLanguage ?? DEFAULT_SETTINGS.appLanguage,
        quranEditionId: deviceLanguage === 'tr' ? 'tr.yazir' : DEFAULT_SETTINGS.quranEditionId,
        calculationMethod: deviceLanguage === 'tr' ? 'turkey' : DEFAULT_SETTINGS.calculationMethod,
      };
      const rawSettings = !session && deviceLanguage ? { ...baseSettings, appLanguage: deviceLanguage } : baseSettings;
      const savedSettings = migrateSettings(rawSettings);
      if (storedSettings && session) void setJson(storageKeys.deviceLanguage, savedSettings.appLanguage);
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
        void scheduleCustomReminders(savedSettings.customReminders, savedSettings.appLanguage);
      }
    })()
      // Whatever fails here, the app must leave the loading screen (with defaults if need be)
      .catch((e) => logError(e, 'promise'))
      .finally(() => setLoading(false));
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
    const { payload: merged, ok } = await syncUserDataFromCloud(s.settings, s.habits, s.family, s.stats, s.darkMode, s.location);
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
    return ok;
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
    // Only reading progress is per member; app data is shared on the device and synced once
    void syncReadingFromCloud();
  }, [loading, settings.activeFamilyMemberId, session, syncReadingFromCloud]);

  useEffect(() => {
    return onReadingProgressChanged((memberId) => {
      if (session && !session.isGuest) {
        scheduleReadingProgressCloudSync(memberId);
      }
    });
  }, [session?.userId, session?.isGuest]);

  // Prayer notifications follow the location/settings effect below, so only state is set here
  const refreshLocation = useCallback(async () => {
    const loc = await getCurrentLocation();
    if (!loc) return false;
    setLocation(loc);
    notifyAppDataChanged();
    return true;
  }, []);

  const setManualLocation = useCallback(async (city: City) => {
    const loc: StoredLocation = {
      latitude: city.latitude,
      longitude: city.longitude,
      city: stateRef.current.settings.appLanguage === 'tr' ? city.tr : city.en,
      country: city.country,
      cityId: city.id,
      updatedAt: new Date().toISOString(),
    };
    await setJson(storageKeys.lastLocation, loc);
    setLocation(loc);
    notifyAppDataChanged();
  }, []);

  // Always call: with notifications switched off it cancels what was scheduled before. Follows only
  // what the notifications depend on, and waits a moment so a burst of changes schedules once
  const lastScheduleRef = useRef(0);
  const scheduleKey = location ? prayerScheduleKey(settings, location) : null;
  useEffect(() => {
    if (!scheduleKey) return;
    const timer = setTimeout(() => {
      const { location: loc, settings: s } = stateRef.current;
      if (!loc) return;
      lastScheduleRef.current = Date.now();
      void schedulePrayerNotifications(loc.latitude, loc.longitude, s);
    }, SCHEDULE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [scheduleKey]);

  const widgetKey = location ? JSON.stringify(widgetInput(location, settings)) : null;
  useEffect(() => {
    const { location: loc, settings: s } = stateRef.current;
    if (!widgetKey || !loc) return;
    const input = widgetInput(loc, s);
    updatePrayerWidget(input);
    // Android refreshes the widget in the background from this copy
    void saveWidgetInput(input).then(registerWidgetTask);
  }, [widgetKey]);

  // Prayer notifications cover a limited number of days; extend the window and roll "today"
  // over whenever the app comes back to the foreground (at most once an hour)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshTodayPrayers();
      if (location && Date.now() - lastScheduleRef.current > 60 * 60 * 1000) {
        lastScheduleRef.current = Date.now();
        void schedulePrayerNotifications(location.latitude, location.longitude, settings);
        updatePrayerWidget(widgetInput(location, settings));
      }
    });
    return () => sub.remove();
  }, [location, settings, refreshTodayPrayers]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    // Sync bookkeeping is not a user change, so it must not make this device's settings "newer"
    const userChange = Object.keys(patch).some((k) => k !== 'cloudSync');
    const next = { ...stateRef.current.settings, ...patch, ...(userChange ? { updatedAt: new Date().toISOString() } : {}) };
    stateRef.current.settings = next;
    setSettings(next);
    await setJson(storageKeys.settings, next);
    if (patch.appLanguage) void setJson(storageKeys.deviceLanguage, patch.appLanguage);
    // Prayer notifications are rescheduled by the location/settings effect; only reminders here
    if (patch.customReminders || patch.appLanguage) {
      void scheduleCustomReminders(next.customReminders, next.appLanguage);
    }
    notifyAppDataChanged();
  }, []);

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
    const today = localDateKey();
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

  const removeHabit = useCallback(async (id: string) => {
    await recordDeletion('habits', id);
    setHabits((prev) => {
      const next = prev.filter((h) => h.id !== id);
      void setJson(storageKeys.habits, next);
      notifyAppDataChanged();
      return next;
    });
  }, []);

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
    await recordDeletion('family', id);
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
    async (type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer', report = true, day?: string) => {
      const next = await recordActivity(type, 1, day);
      setStats(next);
      if (report) void trackFeatureAction(type, 'activity_recorded');
      notifyAppDataChanged();
    },
    []
  );

  const togglePrayerComplete = useCallback(
    async (prayer: PrayerName) => {
      const added = await togglePrayerCompletion(prayer);
      if (added) await trackActivity('prayer');
      // Streak depends on full days of prayers, so recompute on every toggle (including un-marking)
      setStats(await updatePrayerStreak(await loadPrayerCompletions()));
      await refreshTodayPrayers();
    },
    [trackActivity, refreshTodayPrayers]
  );

  // "Prayed" taps on notifications wait in a queue (the Android task runs without this account).
  // Only this account's marks are applied, and they leave the queue once they are stored
  const applyPendingPrayerMarks = useCallback(async () => {
    const scope = session ? getStorageUser() : null;
    if (!scope) return;
    const marks = await peekPendingPrayerMarks(scope);
    if (marks.length === 0) return;
    const added: typeof marks = [];
    for (const m of marks) {
      if (await markPrayerCompleted(m.prayer, m.date)) added.push(m);
    }
    await ackPendingPrayerMarks(marks);
    if (added.length === 0) return;
    // Points go on the day of the prayer, which is not today when the tap is applied later
    for (const m of added) await trackActivity('prayer', true, m.date);
    setStats(await updatePrayerStreak(await loadPrayerCompletions()));
    await refreshTodayPrayers();
  }, [session, trackActivity, refreshTodayPrayers]);

  useEffect(() => {
    if (loading || !session || Platform.OS === 'web') return;
    // Cold start from the action (iOS opens the app for it)
    const last = Notifications.getLastNotificationResponse();
    void (last ? handlePrayerResponse(last).then(() => Notifications.clearLastNotificationResponse()) : Promise.resolve()).then(
      applyPendingPrayerMarks
    );
    const responses = Notifications.addNotificationResponseReceivedListener((r) => {
      void handlePrayerResponse(r).then((handled) => (handled ? applyPendingPrayerMarks() : undefined));
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void applyPendingPrayerMarks();
    });
    return () => {
      responses.remove();
      appState.remove();
    };
  }, [loading, session, applyPendingPrayerMarks]);

  const sendAIMessage = useCallback(async (text: string, reply: string, actions?: AssistantAction[]) => {
    const now = new Date().toISOString();
    const userText = text.trim();
    const assistantText = reply.trim();

    setAiMessages((prev) => {
      const next: AIChatMessage[] = [...prev];
      if (userText) {
        next.push({ id: `${now}-u`, role: 'user', content: userText, timestamp: now });
      }
      if (assistantText) {
        next.push({ id: `${now}-a`, role: 'assistant', content: assistantText, timestamp: now, ...(actions?.length ? { actions } : {}) });
      }
      // Keep the chat bounded (it grew without limit and was rendered in full)
      const kept = next.slice(-AI_CHAT_MAX);
      void setJson(storageKeys.aiChat, kept);
      return kept;
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
      await scheduleCustomReminders(payload.settings.customReminders, payload.settings.appLanguage);
    }
  }, [refreshTodayPrayers]);

  /** Pulls the account's cloud copy, merges it with this device and pushes the result back. */
  const syncNow = useCallback(async () => {
    if (!(await isCloudUserActive())) throw new Error('cloud_unavailable');
    // Report a failed sync instead of showing success (offline, server error)
    if (!(await syncAppDataFromCloud())) throw new Error('sync_failed');
    await syncReadingFromCloud();
    const mergedAt = new Date().toISOString();
    await updateSettings({
      cloudSync: { ...stateRef.current.settings.cloudSync, lastSyncAt: mergedAt, syncEnabled: true },
    });
    return { success: true, mergedAt };
  }, [syncAppDataFromCloud, syncReadingFromCloud, updateSettings]);

  const addCustomReminder = useCallback(
    async (reminder: Omit<CustomReminder, 'id'>) => {
      const newR: CustomReminder = { ...reminder, id: Date.now().toString() };
      await updateSettings({ customReminders: [...stateRef.current.settings.customReminders, newR] });
    },
    [updateSettings]
  );

  const removeCustomReminder = useCallback(
    async (id: string) => {
      await updateSettings({ customReminders: stateRef.current.settings.customReminders.filter((r) => r.id !== id) });
    },
    [updateSettings]
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
        setManualLocation,
        habits,
        addHabit,
        toggleHabitToday,
        removeHabit,
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
