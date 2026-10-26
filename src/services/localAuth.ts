import * as Crypto from 'expo-crypto';
import type { AuthSession, StoredAuthUser } from '../types';
import { getJson, setJson, storageKeys } from './storage';
import { hashEmail, pseudonymFromEmail } from './authCrypto';
import { validateAuthInput } from './authValidation';

const USERS_KEY = '@islamic/auth/users';

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function loadUsers(): Promise<StoredAuthUser[]> {
  return getJson<StoredAuthUser[]>(USERS_KEY, []);
}

async function saveUsers(users: StoredAuthUser[]): Promise<void> {
  await setJson(USERS_KEY, users);
}

export async function getLocalAuthSession(): Promise<AuthSession | null> {
  return getJson<AuthSession | null>(storageKeys.authSession, null);
}

export async function setLocalAuthSession(session: AuthSession | null): Promise<void> {
  await setJson(storageKeys.authSession, session);
}

export async function registerLocalUser(
  email: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const validated = validateAuthInput(email, password, 'new');
  if (!validated.ok) return { ok: false, error: validated.error };
  const normalized = validated.email;
  const emailHash = await hashEmail(normalized);
  const users = await loadUsers();
  if (users.some((u) => u.emailHash === emailHash)) {
    return { ok: false, error: 'exists' };
  }
  const salt = Crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const user: StoredAuthUser = {
    id: Crypto.randomUUID(),
    emailHash,
    passwordHash,
    salt,
    pseudonym: pseudonymFromEmail(normalized),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  const session: AuthSession = { userId: user.id, isGuest: false, pseudonym: user.pseudonym };
  await setLocalAuthSession(session);
  return { ok: true, session };
}

export async function loginLocalUser(
  email: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const validated = validateAuthInput(email, password);
  if (!validated.ok) return { ok: false, error: validated.error };
  const emailHash = await hashEmail(validated.email);
  const users = await loadUsers();
  const user = users.find((u) => u.emailHash === emailHash);
  if (!user) return { ok: false, error: 'wrong_credentials' };
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) return { ok: false, error: 'wrong_credentials' };
  const session: AuthSession = { userId: user.id, isGuest: false, pseudonym: user.pseudonym };
  await setLocalAuthSession(session);
  return { ok: true, session };
}

export async function continueLocalGuest(): Promise<AuthSession> {
  const session: AuthSession = {
    userId: `guest-${Crypto.randomUUID()}`,
    isGuest: true,
    pseudonym: 'Guest',
  };
  await setLocalAuthSession(session);
  return session;
}

export async function deleteLocalUser(
  userId: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!password) return { ok: false, error: 'empty_password' };
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'not_found' };
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) return { ok: false, error: 'wrong_credentials' };
  await saveUsers(users.filter((u) => u.id !== userId));
  return { ok: true };
}

export async function logoutLocalUser(): Promise<void> {
  await setLocalAuthSession(null);
}
