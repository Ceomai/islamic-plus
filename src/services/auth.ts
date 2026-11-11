import * as Notifications from 'expo-notifications';
import type { AuthSession } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { isSupabaseConfigured } from '../config/supabase';
import { resetAIChatSessionId } from './cloudAnalytics';
import { fireAndForget } from './fireAndForget';
import { cancelPrayerScheduling } from './notifications';
import { retagPendingPrayerMarks } from './prayerAction';
import {
  continueLocalGuest,
  deleteLocalUser,
  getLocalAuthSession,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
  setLocalAuthSession,
} from './localAuth';
import { cancelReadingProgressCloudSync, flushReadingProgressCloudSync } from './readingProgressCloud';
import { cancelUserDataCloudSync, flushUserDataCloudSync } from './userDataCloud';
import {
  clearScopedStorage,
  copyScopeIfMissing,
  getJson,
  migrateLegacyStorage,
  setStorageUser,
  storageKeys,
  storageScopeFor,
} from './storage';
import {
  confirmSupabasePasswordReset,
  deleteSupabaseAccount,
  logGuestStartSupabase,
  loginSupabaseUser,
  logoutSupabaseUser,
  registerSupabaseUser,
  requestSupabasePasswordReset,
  restoreSupabaseSession,
} from './supabaseAuth';

export type AuthBackend = 'supabase' | 'local';

export function getAuthBackend(): AuthBackend {
  return isSupabaseConfigured ? 'supabase' : 'local';
}

/** Point local storage at the session's own bucket before any app data is read. */
async function activateSession<T extends AuthSession | null>(session: T): Promise<T> {
  const scope = storageScopeFor(session);
  if (session && !session.isGuest && scope) await migrateLegacyStorage(scope);
  setStorageUser(scope);
  return session;
}

type AuthResult = { ok: true; session: AuthSession } | { ok: false; error: string };

async function activateResult(result: AuthResult): Promise<AuthResult> {
  if (result.ok) await activateSession(result.session);
  return result;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  if (isSupabaseConfigured) {
    const restored = await restoreSupabaseSession();
    const local = await getLocalAuthSession();
    // Offline cold start with an expired token: keep the account signed in on its stored session;
    // the client refreshes the token once the connection is back
    if (restored === 'offline' && local) return activateSession(local);
    if (restored && restored !== 'offline') return activateSession(restored);
    // Supabase aktifken yalnızca misafir oturumu yerelden geri yüklenebilir
    if (local?.isGuest) return activateSession(local);
    await setLocalAuthSession(null);
    return activateSession(null);
  }
  return activateSession(await getLocalAuthSession());
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  const result = isSupabaseConfigured ? await registerSupabaseUser(email, password) : await registerLocalUser(email, password);
  // A new account starts with what was recorded as a guest on this device (prayers, tasbih, kaza…)
  if (result.ok) {
    const scope = storageScopeFor(result.session) ?? result.session.userId;
    await copyScopeIfMissing('guest', scope).catch(() => 0);
    // "Prayed" taps made as a guest while the app was closed are applied to the new account
    await retagPendingPrayerMarks('guest', scope).catch(() => 0);
  }
  return activateResult(result);
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured) return activateResult(await loginSupabaseUser(email, password));
  return activateResult(await loginLocalUser(email, password));
}

export async function continueAsGuest(): Promise<AuthSession> {
  const session = await continueLocalGuest();
  // Analytics only: the guest session (and the first launch's start-up) never waits for the network
  if (isSupabaseConfigured) fireAndForget(logGuestStartSupabase(session.userId), 'auth.guestStart');
  return activateSession(session);
}

export async function logoutUser(): Promise<void> {
  // Push pending changes while storage still points at the outgoing account
  const settings = await getJson(storageKeys.settings, DEFAULT_SETTINGS);
  await flushReadingProgressCloudSync(settings.activeFamilyMemberId);
  await flushUserDataCloudSync();
  if (isSupabaseConfigured) {
    await logoutSupabaseUser();
  }
  await logoutLocalUser();
  await endLocalSession();
}

async function endLocalSession(): Promise<void> {
  // Reminders carry the previous user's titles and schedule — the next session reschedules its own.
  // A scheduling run still under way is stopped first, or it would add them back after the cancel
  await cancelPrayerScheduling().catch(() => undefined);
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  resetAIChatSessionId();
  setStorageUser(null);
}

/** Permanently deletes the signed-in account (cloud + this device). Requires the current password. */
export async function deleteAccount(
  session: AuthSession,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (session.isGuest) return { ok: false, error: 'unknown' };

  cancelUserDataCloudSync();
  cancelReadingProgressCloudSync();

  const result = isSupabaseConfigured
    ? await deleteSupabaseAccount(password)
    : await deleteLocalUser(session.userId, password);
  if (!result.ok) return result;

  const scope = storageScopeFor(session);
  if (scope) await clearScopedStorage(scope);
  await logoutLocalUser();
  await endLocalSession();
  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'reset_unavailable' };
  return requestSupabasePasswordReset(email);
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'reset_unavailable' };
  return activateResult(await confirmSupabasePasswordReset(email, code, newPassword));
}
