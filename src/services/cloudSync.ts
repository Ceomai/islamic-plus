import type {
  ActivityStats,
  EducationProgressEntry,
  FamilyMember,
  LocationPref,
  PrayerCompletion,
  SpiritualHabit,
  TasbihData,
  UserSettings,
  ZakatCalculationRecord,
} from '../types';
import type { StoredLocation } from './location';
import { mergePrayerCompletions } from './prayerHistory';
import { computePrayerStreak } from './statistics';
import { reconcileThemeMode, themeModeFields } from './themeMode';
import { getJson, setJson, storageKeys } from './storage';
import { loadTombstones, mergeTombstones, prayerTombstoneKey, saveTombstones, type Tombstones } from './tombstones';
// Type only: importing kaza.ts here would close the cloudSync ↔ userDataCloud import cycle
import type { KazaData } from './kaza';

export interface SyncPayload {
  version: 2;
  exportedAt: string;
  profileScope: string;
  /** Legacy appearance flag read by older clients; newer ones use settings.themeMode */
  darkMode: boolean;
  settings: UserSettings;
  habits: SpiritualHabit[];
  family: FamilyMember[];
  stats: ActivityStats;
  tasbih: TasbihData;
  duaProgress: Record<string, number>;
  prayerCompletions: PrayerCompletion[];
  educationProgress: EducationProgressEntry[];
  zakatHistory: ZakatCalculationRecord[];
  locationPref: LocationPref | null;
  /** Missed prayers still owed; optional so older payloads stay valid */
  kaza?: KazaData;
  /** Deleted items, so a merge does not bring them back; optional for older payloads */
  deleted?: Tombstones;
}

export async function buildSyncPayload(
  settings: UserSettings,
  habits: SpiritualHabit[],
  family: FamilyMember[],
  stats: ActivityStats,
  darkMode: boolean,
  location: StoredLocation | null
): Promise<SyncPayload> {
  const [tasbih, duaProgress, prayerCompletions, educationProgress, zakatHistory, kaza, deleted] = await Promise.all([
    getJson<TasbihData>(storageKeys.tasbih, { count: 0, total: 0, sessions: [] }),
    getJson<Record<string, number>>(storageKeys.duaProgress, {}),
    getJson<PrayerCompletion[]>(storageKeys.prayerCompletions, []),
    getJson<EducationProgressEntry[]>(storageKeys.educationProgress, []),
    getJson<ZakatCalculationRecord[]>(storageKeys.zakatHistory, []),
    getJson<KazaData | undefined>(storageKeys.kaza, undefined),
    loadTombstones(),
  ]);

  const locationPref: LocationPref | null = location
    ? {
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        updatedAt: location.updatedAt,
      }
    : null;

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    profileScope: settings.activeFamilyMemberId ?? 'default',
    darkMode,
    settings,
    habits,
    family,
    stats,
    tasbih: { ...tasbih, sessions: tasbih.sessions ?? [] },
    duaProgress,
    prayerCompletions,
    educationProgress,
    zakatHistory,
    locationPref,
    kaza,
    deleted,
  };
}

export async function importSyncPayloadToStorage(payload: SyncPayload): Promise<void> {
  await Promise.all([
    setJson(storageKeys.settings, payload.settings),
    setJson(storageKeys.habits, payload.habits),
    setJson(storageKeys.family, payload.family),
    setJson(storageKeys.stats, payload.stats),
    setJson(storageKeys.tasbih, payload.tasbih),
    setJson(storageKeys.duaProgress, payload.duaProgress),
    setJson(storageKeys.prayerCompletions, payload.prayerCompletions),
    setJson(storageKeys.educationProgress, payload.educationProgress),
    setJson(storageKeys.zakatHistory, payload.zakatHistory),
    ...(payload.kaza ? [setJson(storageKeys.kaza, payload.kaza)] : []),
    ...(payload.deleted ? [saveTombstones(payload.deleted)] : []),
  ]);

  if (payload.locationPref) {
    await setJson(storageKeys.lastLocation, {
      latitude: payload.locationPref.latitude,
      longitude: payload.locationPref.longitude,
      city: payload.locationPref.city,
      country: payload.locationPref.country,
      updatedAt: payload.locationPref.updatedAt,
    });
  }
}

export function mergeSyncPayloads(remote: SyncPayload, local: SyncPayload): SyncPayload {
  const mergedAt = new Date().toISOString();
  // Settings carry the time of the last user change. exportedAt is always "now" on this device, so
  // comparing it let a fresh install's defaults overwrite the account's settings in the cloud.
  const localStamp = local.settings.updatedAt ?? '';
  const remoteStamp = remote.settings.updatedAt ?? '';
  const useLocalSettings =
    localStamp !== remoteStamp
      ? localStamp > remoteStamp
      : local.settings.onboardingDone !== remote.settings.onboardingDone
        ? local.settings.onboardingDone // unstamped copies: the one that went through setup is the real one
        : local.exportedAt >= remote.exportedAt;

  const mergedSettings = useLocalSettings
    ? { ...remote.settings, ...local.settings, cloudSync: local.settings.cloudSync }
    : { ...local.settings, ...remote.settings, cloudSync: local.settings.cloudSync };
  // An older client only writes darkMode (in settings and at the top level); keep both fields agreeing
  const winner = useLocalSettings ? local : remote;
  const appearance = themeModeFields(
    reconcileThemeMode({ themeMode: mergedSettings.themeMode, darkMode: mergedSettings.darkMode ?? winner.darkMode })
  );

  const deleted = mergeTombstones(remote.deleted, local.deleted);
  const prayerAlive = (p: PrayerCompletion) => {
    const removedAt = deleted.prayers[prayerTombstoneKey(p)];
    return !removedAt || p.completedAt > removedAt;
  };
  const prayerCompletions = mergePrayerCompletions(remote.prayerCompletions, local.prayerCompletions).filter(prayerAlive);

  return {
    version: 2,
    exportedAt: mergedAt,
    profileScope: local.profileScope,
    darkMode: appearance.darkMode,
    settings: { ...mergedSettings, ...appearance },
    habits: mergeHabits(remote.habits, local.habits).filter((h) => !deleted.habits[h.id]),
    family: mergeFamily(remote.family, local.family).filter((m) => !deleted.family[m.id]),
    // The streak follows from the merged prayers; the larger of two stored streaks could count days
    // whose marks were removed on the other device
    stats: { ...mergeStats(remote.stats, local.stats), prayerStreakDays: computePrayerStreak(prayerCompletions) },
    tasbih: mergeTasbih(remote.tasbih, local.tasbih),
    duaProgress: mergeDuaProgress(remote.duaProgress, local.duaProgress),
    prayerCompletions,
    educationProgress: mergeEducationProgress(remote.educationProgress, local.educationProgress),
    zakatHistory: mergeZakatHistory(remote.zakatHistory, local.zakatHistory),
    locationPref: pickNewerLocation(remote.locationPref, local.locationPref),
    kaza: mergeKaza(remote.kaza, local.kaza),
    deleted,
  };
}

/** Union by id (the larger list used to win, dropping a member added on the other device) */
function mergeFamily(remote: FamilyMember[], local: FamilyMember[]): FamilyMember[] {
  const map = new Map<string, FamilyMember>();
  for (const m of [...remote, ...local]) map.set(m.id, m);
  return [...map.values()];
}

function mergeHabits(remote: SpiritualHabit[], local: SpiritualHabit[]): SpiritualHabit[] {
  const map = new Map<string, SpiritualHabit>();
  for (const h of [...remote, ...local]) {
    const existing = map.get(h.id);
    if (!existing) map.set(h.id, h);
    else {
      const dates = new Set([...existing.completedDates, ...h.completedDates]);
      map.set(h.id, { ...existing, completedDates: [...dates] });
    }
  }
  return [...map.values()];
}

function mergeStats(a: ActivityStats, b: ActivityStats): ActivityStats {
  return {
    tasbihTotal: Math.max(a.tasbihTotal, b.tasbihTotal),
    habitsCompletedTotal: Math.max(a.habitsCompletedTotal, b.habitsCompletedTotal),
    duasReadCount: Math.max(a.duasReadCount, b.duasReadCount),
    quranSessions: Math.max(a.quranSessions, b.quranSessions),
    prayerStreakDays: Math.max(a.prayerStreakDays, b.prayerStreakDays),
    lastActiveDate: a.lastActiveDate > b.lastActiveDate ? a.lastActiveDate : b.lastActiveDate,
    weeklyActivity: a.weeklyActivity.map((v, i) => Math.max(v, b.weeklyActivity[i] ?? 0)),
    dailyPoints: mergeDailyPoints(a.dailyPoints, b.dailyPoints),
  };
}

function mergeDailyPoints(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

function mergeTasbih(a: TasbihData, b: TasbihData): TasbihData {
  const sessionMap = new Map<string, TasbihData['sessions'][0]>();
  for (const s of [...(a.sessions ?? []), ...(b.sessions ?? [])]) {
    if (!sessionMap.has(s.id)) sessionMap.set(s.id, s);
  }
  return {
    count: b.count,
    total: Math.max(a.total, b.total),
    sessions: [...sessionMap.values()].sort((x, y) => y.completedAt.localeCompare(x.completedAt)).slice(0, 200),
    log: mergeTasbihLogs(a.log, b.log),
    dailyGoal: b.dailyGoal ?? a.dailyGoal,
  };
}

/** Newer record wins: kaza counts go up and down, so a maximum would undo made-up prayers */
function mergeKaza(a: KazaData | undefined, b: KazaData | undefined): KazaData | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.updatedAt >= b.updatedAt ? a : b;
}

function mergeTasbihLogs(
  a: Record<string, number[]> = {},
  b: Record<string, number[]> = {}
): Record<string, number[]> {
  const out: Record<string, number[]> = { ...a };
  for (const [day, hours] of Object.entries(b)) {
    const mine = out[day] ?? new Array(24).fill(0);
    out[day] = mine.map((v, i) => Math.max(v, hours[i] ?? 0));
  }
  return out;
}

function mergeDuaProgress(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, number> = {};
  keys.forEach((k) => {
    out[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  });
  return out;
}

function mergeEducationProgress(a: EducationProgressEntry[], b: EducationProgressEntry[]): EducationProgressEntry[] {
  const map = new Map<string, EducationProgressEntry>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.topicId);
    if (!existing) map.set(item.topicId, item);
    else {
      map.set(item.topicId, {
        topicId: item.topicId,
        readCount: Math.max(existing.readCount, item.readCount),
        lastOpenedAt: existing.lastOpenedAt > item.lastOpenedAt ? existing.lastOpenedAt : item.lastOpenedAt,
      });
    }
  }
  return [...map.values()];
}

function mergeZakatHistory(a: ZakatCalculationRecord[], b: ZakatCalculationRecord[]): ZakatCalculationRecord[] {
  const map = new Map<string, ZakatCalculationRecord>();
  for (const item of [...a, ...b]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()].sort((x, y) => y.calculatedAt.localeCompare(x.calculatedAt)).slice(0, 20);
}

function pickNewerLocation(a: LocationPref | null, b: LocationPref | null): LocationPref | null {
  if (!a) return b;
  if (!b) return a;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export function payloadToJson(payload: SyncPayload): string {
  return JSON.stringify(payload, null, 2);
}

// Re-export merge helpers for tests
export { mergeHabits, mergeStats };
