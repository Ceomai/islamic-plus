import { localDateKey } from '../utils/date';
import type { PrayerCompletion, PrayerName } from '../types';
import { trimPrayerHistory } from './prayerHistory';
import { getJson, setJson, storageKeys } from './storage';
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

export async function isPrayerCompletedToday(prayer: PrayerName): Promise<boolean> {
  const today = todayKey();
  const list = await loadPrayerCompletions();
  return list.some((p) => p.prayer === prayer && p.date === today);
}

async function toggleNow(prayer: PrayerName): Promise<boolean> {
  const today = todayKey();
  const list = await loadPrayerCompletions();
  const existing = list.find((p) => p.prayer === prayer && p.date === today);

  if (existing) {
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

// Taps are applied one after another: two quick taps used to read the same list and lose one
let queue: Promise<unknown> = Promise.resolve();

export function togglePrayerCompletion(prayer: PrayerName): Promise<boolean> {
  const run = queue.then(() => toggleNow(prayer));
  queue = run.catch(() => undefined);
  return run;
}

export async function getTodayCompletions(): Promise<PrayerCompletion[]> {
  const today = todayKey();
  return (await loadPrayerCompletions()).filter((p) => p.date === today);
}
