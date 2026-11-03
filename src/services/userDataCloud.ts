import { DEFAULT_SETTINGS } from '../constants/defaults';
import { getSupabase } from '../config/supabase';
import { isCloudUserActive } from './cloudUser';
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
/**
 * App data (settings, habits, prayers, tasbih, kaza…) is stored once per account on the device, not
 * per family member, so it is synced under one scope. Syncing it per member mixed one member's
 * cloud copy into everyone's data and brought deleted items back when switching members.
 * Reading progress is per member and keeps its own scopes (readingProgressCloud.ts).
 */
const APP_DATA_SCOPE = 'default';
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

/** Sends the given payload, or the app's current data. Returns false when it did not reach the server. */
export async function pushUserDataNow(payload?: SyncPayload): Promise<boolean> {
  if (!(await isCloudUserActive())) return false;
  const body = payload ?? (await buildCurrentPayload());
  if (!body) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc('sync_user_app_data', {
    p_profile_scope: APP_DATA_SCOPE,
    p_payload: { ...body, profileScope: APP_DATA_SCOPE },
  });
  if (error) console.warn('[user-data-cloud] push failed:', error.message);
  return !error;
}

/**
 * Pulls the account's cloud copy, merges it with this device and pushes the result back.
 * `ok` is false when the server could not be reached (the payload is then the local data).
 */
export async function syncUserDataFromCloud(
  settings: UserSettings,
  habits: SpiritualHabit[],
  family: FamilyMember[],
  stats: ActivityStats,
  darkMode: boolean,
  location: StoredLocation | null
): Promise<{ payload: SyncPayload; ok: boolean }> {
  // Built after the network answer, so changes made while the request was in flight are included
  const localNow = async () => (await buildCurrentPayload()) ?? buildSyncPayload(settings, habits, family, stats, darkMode, location);

  const supabase = getSupabase();
  if (!supabase || !(await isCloudUserActive())) return { payload: await localNow(), ok: false };

  const { data, error } = await supabase.rpc('get_user_app_data', { p_profile_scope: APP_DATA_SCOPE });
  if (error) {
    console.warn('[user-data-cloud] pull failed:', error.message);
    return { payload: await localNow(), ok: false };
  }

  const local = await localNow();
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.payload) {
    return { payload: local, ok: await pushUserDataNow(local) };
  }

  const remote = row.payload as SyncPayload;
  const merged = mergeSyncPayloads({ ...remote, version: 2, profileScope: APP_DATA_SCOPE }, local);

  await importSyncPayloadToStorage(merged);
  // Push the merged result itself: the app's state still holds the pre-merge values at this point
  return { payload: merged, ok: await pushUserDataNow(merged) };
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
