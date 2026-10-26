import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabase } from '../config/supabase';

/**
 * Device-wide log of app errors (not tied to an account). Each error is also sent to the
 * write-only app_errors table (migration 008) so crashes during testing reach the developer
 * without a third-party crash service.
 */
const KEY = '@islamic/error-log';
const MAX_ENTRIES = 30;
/** Errors that could not be sent (offline, server down); retried on the next app start */
const PENDING_KEY = '@islamic/error-pending';
const MAX_PENDING = 10;
/** Per app session: at most this many uploads, and each distinct message only once */
const MAX_UPLOADS = 20;
const uploaded = new Set<string>();

export const appVersion = () => Constants.expoConfig?.version ?? '?';
export const platformLabel = () => `${Platform.OS} ${String(Platform.Version)}`;

async function readPending(): Promise<ErrorEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

async function addPending(entry: ErrorEntry): Promise<void> {
  try {
    const pending = await readPending();
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([entry, ...pending].slice(0, MAX_PENDING)));
  } catch {
    // Best effort only
  }
}

/** Returns false when the row did not reach the server */
async function insertError(entry: ErrorEntry): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true; // not configured: nothing to retry
  const { error } = await supabase.from('app_errors').insert({
    source: entry.source,
    message: entry.message,
    stack: entry.stack?.slice(0, 4000) ?? null,
    fatal: !!entry.fatal,
    app_version: appVersion(),
    platform: platformLabel(),
    occurred_at: entry.at,
  });
  return !error;
}

async function uploadError(entry: ErrorEntry): Promise<void> {
  if (uploaded.size >= MAX_UPLOADS || uploaded.has(entry.message)) return;
  uploaded.add(entry.message);
  const ok = await insertError(entry).catch(() => false);
  if (!ok) await addPending(entry);
}

/** Sends errors queued while offline. Called once at app start. */
export async function flushPendingErrors(): Promise<void> {
  const pending = await readPending();
  if (!pending.length) return;
  const failed: ErrorEntry[] = [];
  for (const entry of pending) {
    const ok = await insertError(entry).catch(() => false);
    if (!ok) failed.push(entry);
  }
  try {
    if (failed.length) await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(failed));
    else await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // Best effort only
  }
}

export interface ErrorEntry {
  at: string;
  source: 'render' | 'global' | 'promise';
  message: string;
  stack?: string;
  fatal?: boolean;
}

export async function getErrorLog(): Promise<ErrorEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

export async function clearErrorLog(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function logError(error: unknown, source: ErrorEntry['source'], fatal = false): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorEntry = {
    at: new Date().toISOString(),
    source,
    message: err.message.slice(0, 500),
    stack: err.stack?.split('\n').slice(0, 8).join('\n'),
    fatal,
  };
  try {
    const log = await getErrorLog();
    await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...log].slice(0, MAX_ENTRIES)));
  } catch {
    // Storage itself failing must never cause another error
  }
  void uploadError(entry).catch(() => undefined);
}

/** Plain-text report for a tester to share: app/device details and the latest errors. */
export async function formatErrorReport(): Promise<string> {
  const log = await getErrorLog();
  const header = [
    `Islamic+ ${appVersion()}`,
    platformLabel(),
    `report: ${new Date().toISOString()}`,
    `errors: ${log.length}`,
  ].join('\n');
  const body = log
    .map((e, i) => `#${i + 1} ${e.at} [${e.source}${e.fatal ? ', fatal' : ''}]\n${e.message}${e.stack ? `\n${e.stack}` : ''}`)
    .join('\n\n');
  return body ? `${header}\n\n${body}` : header;
}

let installed = false;

/** Records uncaught JS errors as well (they bypass React's error boundary). */
export function installGlobalErrorHandler(): void {
  if (installed) return;
  installed = true;
  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void } }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, fatal) => {
    void logError(error, 'global', !!fatal);
    previous(error, fatal);
  });
}
