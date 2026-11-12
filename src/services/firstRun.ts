import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession } from '../types';
import { LEGACY_MIGRATED_KEY, storageKeys } from './storage';

/**
 * Where the app opens:
 * - startGuest: the very first launch on this device — a guest session starts on its own, so a new
 *   user meets the introduction instead of an e-mail/password wall (only cloud sync needs an account)
 * - auth: nobody is signed in and the device has been used before (e.g. after signing out)
 * - onboarding / home: someone is signed in (guest or account)
 */
export type LaunchRoute = 'startGuest' | 'auth' | 'onboarding' | 'home';

export function initialRoute({
  session,
  firstRunDone,
  onboardingDone,
}: {
  session: AuthSession | null;
  firstRunDone: boolean;
  onboardingDone: boolean;
}): LaunchRoute {
  if (session) return onboardingDone ? 'home' : 'onboarding';
  return firstRunDone ? 'auth' : 'startGuest';
}

const USERS_KEY = '@islamic/auth/users';

/** Data from an install that predates the flag means the person has been here before. */
export function hasPriorAppData(keys: readonly string[]): boolean {
  return keys.some(
    (k) => k.includes('@@') || k === USERS_KEY || k === LEGACY_MIGRATED_KEY || k === storageKeys.settings
  );
}

export async function isFirstRunDone(): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(storageKeys.firstRunDone)) return true;
    return hasPriorAppData(await AsyncStorage.getAllKeys());
  } catch {
    // Unreadable storage: show the sign-in screen as before rather than guessing
    return true;
  }
}

/**
 * Set as soon as the automatic guest session exists: the session itself is stored, so a crash during
 * the introduction reopens the introduction, and a later sign-out shows the sign-in screen.
 */
export async function markFirstRunDone(): Promise<void> {
  await AsyncStorage.setItem(storageKeys.firstRunDone, '1').catch(() => undefined);
}
