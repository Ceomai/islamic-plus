import { DEFAULT_SETTINGS } from '../constants/defaults';
import { getSupabase } from '../config/supabase';
import { isCloudUserActive, profileScope } from './cloudUser';
import {
  buildSyncPayload,
  importSyncPayloadToStorage,
  mergeSyncPayloads,
  type SyncPayload,
} from './cloudSync';
import type {
  ActivityStats,
  FamilyMember,
  SpiritualHabit,
  UserSettings,
} from '../types';
import type { StoredLocation } from './location';
import { getJson, storageKeys } from './storage';

const SYNC_DEBOUNCE_MS = 3000;
const DEFAULT_STATS: ActivityStats = {
  tasbihTotal: 0,
  habitsCompletedTotal: 0,
  duasReadCount: 0,
  quranSessions: 0,
  prayerStreakDays: 0,
  lastActiveDate: '',
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(memberId: string | null) => void>();

type PayloadBuilder = () => Promise<SyncPayload>;
let payloadBuilder: PayloadBuilder | null = null;

export function registerAppDataPayloadBuilder(builder: PayloadBuilder | null): void {
  payloadBuilder = builder;
}

export function notifyAppDataChanged(): void {
  listeners.forEach((fn) => fn(null));
  scheduleUserDataCloudSync(null);
}

export function onAppDataChanged(listener: (memberId: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function scheduleUserDataCloudSync(_memberId: string | null): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void pushUserDataNow();
  }, SYNC_DEBOUNCE_MS);
}

async function buildCurrentPayload(): Promise<SyncPayload | null> {
  if (!payloadBuilder) return null;
  return payloadBuilder();
}

export async function pushUserDataNow(): Promise<void> {
  if (!(await isCloudUserActive())) return;
  const payload = await buildCurrentPayload();
  if (!payload) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const scope = profileScope(payload.settings.activeFamilyMemberId);
  const { error } = await supabase.rpc('sync_user_app_data', {
    p_profile_scope: scope,
    p_payload: payload,
  });
  if (error) console.warn('[user-data-cloud] push failed:', error.message);
}

export async function syncUserDataFromCloud(
  settings: UserSettings,
  habits: SpiritualHabit[],
  family: FamilyMember[],
  stats: ActivityStats,
  darkMode: boolean,
  location: StoredLocation | null
): Promise<SyncPayload> {
  const local = await buildSyncPayload(settings, habits, family, stats, darkMode, location);

  if (!(await isCloudUserActive())) return local;

  const supabase = getSupabase();
  if (!supabase) return local;

  const scope = profileScope(settings.activeFamilyMemberId);
  const { data, error } = await supabase.rpc('get_user_app_data', { p_profile_scope: scope });

  if (error) {
    console.warn('[user-data-cloud] pull failed:', error.message);
    await pushUserDataNow();
    return local;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.payload) {
    await pushUserDataNow();
    return local;
  }

  const remote = row.payload as SyncPayload;
  const merged = mergeSyncPayloads({ ...remote, version: 2, profileScope: scope }, local);

  await importSyncPayloadToStorage(merged);
  await pushUserDataNow();
  return merged;
}

/** Drop a pending push without sending it (account deleted). */
export function cancelUserDataCloudSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export async function flushUserDataCloudSync(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await pushUserDataNow();
}

export async function reloadLocalAppData(): Promise<{
  settings: UserSettings;
  habits: SpiritualHabit[];
  family: FamilyMember[];
  stats: ActivityStats;
  darkMode: boolean;
}> {
  const settings = await getJson(storageKeys.settings, DEFAULT_SETTINGS);
  const habits = await getJson<SpiritualHabit[]>(storageKeys.habits, []);
  const family = await getJson<FamilyMember[]>(storageKeys.family, []);
  const stats = await getJson<ActivityStats>(storageKeys.stats, DEFAULT_STATS);
  return { settings, habits, family, stats, darkMode: settings.darkMode ?? false };
}
