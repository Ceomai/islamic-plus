import { localDateKey } from '../utils/date';
import { createSerialQueue } from '../utils/serial';
import type { PrayerCompletion, PrayerName } from '../types';
import { trimPrayerHistory } from './prayerHistory';
import { getJson, setJson, storageKeys } from './storage';
import { prayerTombstoneKey, recordDeletion } from './tombstones';
import { notifyAppDataChanged } from './userDataCloud';

export { mergePrayerCompletions } from './prayerHistory';

function todayKey(): string {
  return localDateKey();
}

export async function loadPrayerCompletions(): Promise<PrayerCompletion[]> {
  return getJson(storageKeys.prayerCompletions, []);
}

export async function savePrayerCompletions(list: PrayerCompletion[]): Promise<void> {
  await setJson(storageKeys.prayerCompletions, list);
  notifyAppDataChanged();
}

async function toggleNow(prayer: PrayerName): Promise<boolean> {
  const today = todayKey();
  const list = await loadPrayerCompletions();
  const existing = list.find((p) => p.prayer === prayer && p.date === today);

  if (existing) {
    // Remembered so another device's copy of the mark does not bring it back in a sync
    await recordDeletion('prayers', prayerTombstoneKey(existing));
    await savePrayerCompletions(list.filter((p) => !(p.prayer === prayer && p.date === today)));
    return false;
  }

  const entry: PrayerCompletion = {
    // One mark per prayer and day, so the id is derived from them (Date.now() could repeat)
    id: `pr-${today}-${prayer}`,
    prayer,
    date: today,
    completedAt: new Date().toISOString(),
  };
  await savePrayerCompletions(trimPrayerHistory([entry, ...list]));
  return true;
}

/** Adds the mark if it is not there yet (the notification's "Prayed" button never un-marks). */
async function markNow(prayer: PrayerName, date: string): Promise<boolean> {
  const list = await loadPrayerCompletions();
  if (list.some((p) => p.prayer === prayer && p.date === date)) return false;
  const entry: PrayerCompletion = { id: `pr-${date}-${prayer}`, prayer, date, completedAt: new Date().toISOString() };
  await savePrayerCompletions(trimPrayerHistory([entry, ...list]));
  return true;
}

// Taps are applied one after another: two quick taps used to read the same list and lose one
const serial = createSerialQueue();

export function togglePrayerCompletion(prayer: PrayerName): Promise<boolean> {
  return serial(() => toggleNow(prayer));
}

export function markPrayerCompleted(prayer: PrayerName, date: string): Promise<boolean> {
  return serial(() => markNow(prayer, date));
}

export async function getTodayCompletions(): Promise<PrayerCompletion[]> {
  const today = todayKey();
  return (await loadPrayerCompletions()).filter((p) => p.date === today);
}
