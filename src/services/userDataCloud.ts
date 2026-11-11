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

const SYNC_DEBOUNCE_MS = 3000;
/**
 * App data (settings, habits, prayers, tasbih, kaza…) is stored once per account on the device, not
 * per family member, so it is synced under one scope. Syncing it per member mixed one member's
 * cloud copy into everyone's data and brought deleted items back when switching members.
 * Reading progress is per member and keeps its own scopes (readingProgressCloud.ts).
 */
const APP_DATA_SCOPE = 'default';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
/** Counts local changes, so a sync can tell whether something changed while it was running */
let localChanges = 0;

type PayloadBuilder = () => Promise<SyncPayload>;
let payloadBuilder: PayloadBuilder | null = null;

export function registerAppDataPayloadBuilder(builder: PayloadBuilder | null): void {
  payloadBuilder = builder;
}

export function notifyAppDataChanged(): void {
  localChanges++;
  scheduleUserDataCloudSync(null);
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

  const changesBefore = localChanges;
  const local = await localNow();
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.payload) {
    const ok = await pushUserDataNow(local);
    // A change made during the push is newer than `local`; the caller must not roll it back
    return { payload: localChanges === changesBefore ? local : await localNow(), ok };
  }

  const remote = row.payload as SyncPayload;
  const merged = mergeSyncPayloads({ ...remote, version: 2, profileScope: APP_DATA_SCOPE }, local);

  await importSyncPayloadToStorage(merged);
  // Push the merged result itself: the app's state still holds the pre-merge values at this point
  const ok = await pushUserDataNow(merged);
  if (localChanges === changesBefore) return { payload: merged, ok };

  // Something changed on this device while the merge was written and pushed: the app's state has
  // the change but not the merge, storage may have either. Merge again so neither is lost (the
  // change itself already scheduled its own push)
  const latest = mergeSyncPayloads(merged, await localNow());
  await importSyncPayloadToStorage(latest);
  return { payload: latest, ok };
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
