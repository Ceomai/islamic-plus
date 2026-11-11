import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  settings: '@islamic/settings',
  habits: '@islamic/habits',
  tasbih: '@islamic/tasbih',
  lastLocation: '@islamic/lastLocation',
  family: '@islamic/family',
  stats: '@islamic/stats',
  cloudBlob: '@islamic/cloudBlob',
  aiChat: '@islamic/aiChat',
  offlineAudio: '@islamic/offlineAudio',
  duaProgress: '@islamic/duaProgress',
  authSession: '@islamic/auth/session',
  quranProgress: '@islamic/reading/quran',
  hadithProgress: '@islamic/reading/hadith',
  prayerCompletions: '@islamic/prayerCompletions',
  educationProgress: '@islamic/educationProgress',
  zakatHistory: '@islamic/zakatHistory',
  deviceLanguage: '@islamic/deviceLanguage',
  /** Set once this device has started its first (automatic guest) session — see firstRun.ts */
  firstRunDone: '@islamic/firstRunDone',
  kaza: '@islamic/kaza',
  /** Deleted habits, family members and prayer marks (see tombstones.ts) */
  deleted: '@islamic/deleted',
  /** Set once the app has shown the system notification prompt on this device (see notifications.ts) */
  notificationPermissionAsked: '@islamic/notificationPermissionAsked',
};

/** Device-wide keys — everything else belongs to the signed-in account. */
const DEVICE_KEYS = new Set<string>([
  KEYS.authSession,
  KEYS.offlineAudio,
  KEYS.deviceLanguage,
  KEYS.firstRunDone,
  KEYS.notificationPermissionAsked,
  '@islamic/auth/users',
  // Written by headless tasks, which run without a signed-in account (prayerAction.ts, widgetBackground.ts)
  '@islamic/pending-prayer-marks',
  '@islamic/widget-input',
]);
/** Device-wide key families: the error log and its upload queue (errorLog.ts) */
const DEVICE_KEY_PREFIXES = ['@islamic/error-'];
export const LEGACY_MIGRATED_KEY = '@islamic/legacyMigratedTo';

let storageUser: string | null = null;

/** Guests share one device-local bucket; accounts get their own. */
export function storageScopeFor(session: { userId: string; isGuest: boolean } | null): string | null {
  if (!session) return null;
  return session.isGuest ? 'guest' : session.userId;
}

export function setStorageUser(scope: string | null): void {
  storageUser = scope;
}

/** The bucket app data is read from and written to right now (null: nobody signed in). */
export function getStorageUser(): string | null {
  return storageUser;
}

function isUserKey(key: string): boolean {
  return (
    key.startsWith('@islamic/') &&
    !DEVICE_KEYS.has(key) &&
    !DEVICE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
    key !== LEGACY_MIGRATED_KEY
  );
}

function resolveKey(key: string): string {
  if (!isUserKey(key)) return key;
  return `${key}@@${storageUser ?? 'anon'}`;
}

/**
 * Data written before per-account storage existed has no owner. Hand it to the first
 * account that is restored or signs in on this device, then delete the unscoped copies.
 */
export async function migrateLegacyStorage(scope: string): Promise<void> {
  if (await AsyncStorage.getItem(LEGACY_MIGRATED_KEY)) return;
  const all = await AsyncStorage.getAllKeys();
  const legacy = all.filter((k) => isUserKey(k) && !k.includes('@@'));
  for (const key of legacy) {
    const scoped = `${key}@@${scope}`;
    if (!all.includes(scoped)) {
      const raw = await AsyncStorage.getItem(key);
      if (raw != null) await AsyncStorage.setItem(scoped, raw);
    }
  }
  if (legacy.length) await AsyncStorage.multiRemove(legacy);
  await AsyncStorage.setItem(LEGACY_MIGRATED_KEY, scope);
}

/**
 * Copies one bucket's values into another that does not have them yet. Used when a guest creates
 * an account on this device: without it everything recorded as a guest disappeared from view.
 * Returns how many values were copied.
 */
export async function copyScopeIfMissing(from: string, to: string): Promise<number> {
  const all = await AsyncStorage.getAllKeys();
  const source = all.filter((k) => k.endsWith(`@@${from}`));
  let copied = 0;
  for (const key of source) {
    const target = `${key.slice(0, -from.length)}${to}`;
    if (all.includes(target)) continue;
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) continue;
    await AsyncStorage.setItem(target, raw);
    copied++;
  }
  return copied;
}

/** Remove every locally stored value that belongs to one account (used on account deletion). */
export async function clearScopedStorage(scope: string): Promise<void> {
  const all = await AsyncStorage.getAllKeys();
  const owned = all.filter((k) => k.endsWith(`@@${scope}`));
  if (owned.length) await AsyncStorage.multiRemove(owned);
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(resolveKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(resolveKey(key), JSON.stringify(value));
}

export const storageKeys = KEYS;
