import type { PrayerCompletion } from '../types';
import { createSerialQueue } from '../utils/serial';
import { getJson, setJson, storageKeys } from './storage';

/**
 * Deletions travel with the sync payload. A merge only ever took the union of two devices, so a
 * habit, family member or prayer mark removed on one device came back from the other one.
 * Each entry is "key → when it was deleted"; something recorded again after that time wins.
 */
export interface Tombstones {
  habits: Record<string, string>;
  family: Record<string, string>;
  /** "prayer:YYYY-MM-DD" */
  prayers: Record<string, string>;
}

export type TombstoneKind = keyof Tombstones;

/** Long enough for any device to sync at least once; older entries are dropped */
const KEEP_DAYS = 180;

export const emptyTombstones = (): Tombstones => ({ habits: {}, family: {}, prayers: {} });

export const prayerTombstoneKey = (p: Pick<PrayerCompletion, 'prayer' | 'date'>) => `${p.prayer}:${p.date}`;

function prune(map: Record<string, string>, now: Date): Record<string, string> {
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString();
  return Object.fromEntries(Object.entries(map).filter(([, at]) => at >= cutoff));
}

function mergeMap(a: Record<string, string> = {}, b: Record<string, string> = {}): Record<string, string> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v > out[k]) out[k] = v;
  return out;
}

export function mergeTombstones(a: Partial<Tombstones> | undefined, b: Partial<Tombstones> | undefined, now = new Date()): Tombstones {
  return {
    habits: prune(mergeMap(a?.habits, b?.habits), now),
    family: prune(mergeMap(a?.family, b?.family), now),
    prayers: prune(mergeMap(a?.prayers, b?.prayers), now),
  };
}

export async function loadTombstones(): Promise<Tombstones> {
  return mergeTombstones(emptyTombstones(), await getJson<Partial<Tombstones>>(storageKeys.deleted, emptyTombstones()));
}

export async function saveTombstones(t: Tombstones): Promise<void> {
  await setJson(storageKeys.deleted, t);
}

const serial = createSerialQueue();

export function recordDeletion(kind: TombstoneKind, key: string, at = new Date()): Promise<void> {
  return serial(async () => {
    const t = await loadTombstones();
    t[kind] = { ...t[kind], [key]: at.toISOString() };
    await saveTombstones(t);
  });
}
