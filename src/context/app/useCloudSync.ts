import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { scheduleCustomReminders } from '../../services/advancedReminders';
import { buildSyncPayload, importSyncPayloadToStorage, type SyncPayload } from '../../services/cloudSync';
import { isCloudUserActive } from '../../services/cloudUser';
import { fireAndForget } from '../../services/fireAndForget';
import type { StoredLocation } from '../../services/location';
import { syncReadingProgressFromCloud } from '../../services/readingProgressCloud';
import { legacyDarkMode, reconcileThemeMode, themeModeFields } from '../../services/themeMode';
import { registerAppDataPayloadBuilder, syncUserDataFromCloud } from '../../services/userDataCloud';
import type {
  ActivityStats,
  AuthSession,
  FamilyMember,
  HadithProgress,
  QuranProgress,
  SpiritualHabit,
  UserSettings,
} from '../../types';
import type { SyncSlice } from './slices';

/** Settings from a synced or imported payload, with themeMode filled in for payloads from older clients */
function withReconciledTheme(payload: SyncPayload): UserSettings {
  const s = payload.settings;
  return { ...s, ...themeModeFields(reconcileThemeMode({ themeMode: s.themeMode, darkMode: s.darkMode ?? payload.darkMode })) };
}

/** The place stored in a payload, when it has one */
function payloadLocation(payload: SyncPayload): StoredLocation | null {
  const p = payload.locationPref;
  return p ? { latitude: p.latitude, longitude: p.longitude, city: p.city, country: p.country, updatedAt: p.updatedAt } : null;
}

interface Deps {
  session: AuthSession | null;
  authReady: boolean;
  loading: boolean;
  activeFamilyMemberId: string | null;
  settingsRef: RefObject<UserSettings>;
  habitsRef: RefObject<SpiritualHabit[]>;
  familyRef: RefObject<FamilyMember[]>;
  statsRef: RefObject<ActivityStats>;
  locationRef: RefObject<StoredLocation | null>;
  setSettings: (s: UserSettings) => void;
  setHabits: (h: SpiritualHabit[]) => void;
  setFamily: (f: FamilyMember[]) => void;
  setStats: (s: ActivityStats) => void;
  setLocation: (l: StoredLocation) => void;
  setReadingProgress: (quran: QuranProgress, hadith: HadithProgress) => void;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  refreshTodayPrayers: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

/** Cloud sync of the account's data and reading progress, and file export/import. */
export function useCloudSync(d: Deps) {
  const { session, authReady, loading, activeFamilyMemberId, settingsRef, habitsRef, familyRef, statsRef, locationRef } = d;
  const { setSettings, setHabits, setFamily, setStats, setLocation, setReadingProgress } = d;
  const { updateSettings, refreshTodayPrayers, refreshStats } = d;

  const currentPayload = useCallback(() => {
    const s = settingsRef.current;
    return buildSyncPayload(s, habitsRef.current, familyRef.current, statsRef.current, legacyDarkMode(s.themeMode), locationRef.current);
  }, [settingsRef, habitsRef, familyRef, statsRef, locationRef]);

  useEffect(() => {
    registerAppDataPayloadBuilder(currentPayload);
    return () => registerAppDataPayloadBuilder(null);
  }, [currentPayload]);

  const applyPayload = useCallback(
    (payload: SyncPayload) => {
      setSettings(withReconciledTheme(payload));
      setHabits(payload.habits);
      setFamily(payload.family);
      setStats(payload.stats);
      const loc = payloadLocation(payload);
      if (loc) setLocation(loc);
    },
    [setSettings, setHabits, setFamily, setStats, setLocation]
  );

  const syncReadingFromCloud = useCallback(async () => {
    const { quran, hadith } = await syncReadingProgressFromCloud(settingsRef.current.activeFamilyMemberId);
    setReadingProgress(quran, hadith);
  }, [settingsRef, setReadingProgress]);

  const syncAppDataFromCloud = useCallback(async () => {
    const s = settingsRef.current;
    const { payload: merged, ok } = await syncUserDataFromCloud(
      s,
      habitsRef.current,
      familyRef.current,
      statsRef.current,
      legacyDarkMode(s.themeMode),
      locationRef.current
    );
    applyPayload(merged);
    await refreshTodayPrayers();
    await refreshStats();
    return ok;
  }, [settingsRef, habitsRef, familyRef, statsRef, locationRef, applyPayload, refreshTodayPrayers, refreshStats]);

  // Pull from cloud once per mount (AppProvider is remounted per account), after local data has loaded
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (loading || initialSyncDone.current || !authReady || !session || session.isGuest) return;
    initialSyncDone.current = true;
    fireAndForget(syncAppDataFromCloud(), 'sync.initialAppData');
    fireAndForget(syncReadingFromCloud(), 'sync.initialReading');
  }, [loading, authReady, session, syncAppDataFromCloud, syncReadingFromCloud]);

  // Switching family member loads that member's cloud scope
  const lastMemberId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (loading) return;
    if (lastMemberId.current === undefined) {
      lastMemberId.current = activeFamilyMemberId;
      return;
    }
    if (lastMemberId.current === activeFamilyMemberId) return;
    lastMemberId.current = activeFamilyMemberId;
    if (!session || session.isGuest) return;
    // Only reading progress is per member; app data is shared on the device and synced once
    fireAndForget(syncReadingFromCloud(), 'sync.memberReading');
  }, [loading, activeFamilyMemberId, session, syncReadingFromCloud]);

  const importSyncPayload = useCallback(
    async (payload: SyncPayload) => {
      await importSyncPayloadToStorage(payload);
      applyPayload(payload);
      await refreshTodayPrayers();
      if (payload.settings.customReminders.length > 0) {
        await scheduleCustomReminders(payload.settings.customReminders, payload.settings.appLanguage);
      }
    },
    [applyPayload, refreshTodayPrayers]
  );

  /** Pulls the account's cloud copy, merges it with this device and pushes the result back. */
  const syncNow = useCallback(async () => {
    if (!(await isCloudUserActive())) throw new Error('cloud_unavailable');
    // Report a failed sync instead of showing success (offline, server error)
    if (!(await syncAppDataFromCloud())) throw new Error('sync_failed');
    await syncReadingFromCloud();
    const mergedAt = new Date().toISOString();
    await updateSettings({
      cloudSync: { ...settingsRef.current.cloudSync, lastSyncAt: mergedAt, syncEnabled: true },
    });
    return { success: true, mergedAt };
  }, [syncAppDataFromCloud, syncReadingFromCloud, updateSettings, settingsRef]);

  return useMemo<SyncSlice>(() => ({ syncNow, exportSyncPayload: currentPayload, importSyncPayload }), [syncNow, currentPayload, importSyncPayload]);
}
