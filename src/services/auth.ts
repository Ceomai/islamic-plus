import * as Notifications from 'expo-notifications';
import type { AuthSession } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { isSupabaseConfigured } from '../config/supabase';
import { resetAIChatSessionId } from './cloudAnalytics';
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
    if (restored) return activateSession(restored);
    // Supabase aktifken yalnızca misafir oturumu yerelden geri yüklenebilir
    const local = await getLocalAuthSession();
    if (local?.isGuest) return activateSession(local);
    await setLocalAuthSession(null);
    return activateSession(null);
  }
  return activateSession(await getLocalAuthSession());
}

export async function setAuthSession(session: AuthSession | null): Promise<void> {
  await setLocalAuthSession(session);
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured) return activateResult(await registerSupabaseUser(email, password));
  return activateResult(await registerLocalUser(email, password));
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured) return activateResult(await loginSupabaseUser(email, password));
  return activateResult(await loginLocalUser(email, password));
}

export async function continueAsGuest(): Promise<AuthSession> {
  const session = await continueLocalGuest();
  if (isSupabaseConfigured) {
    await logGuestStartSupabase(session.userId);
  }
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
  // Reminders carry the previous user's titles and schedule — the next session reschedules its own
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
