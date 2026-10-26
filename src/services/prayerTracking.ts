import { localDateKey } from '../utils/date';
import type { PrayerCompletion, PrayerName } from '../types';
import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

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

export async function togglePrayerCompletion(prayer: PrayerName): Promise<boolean> {
  const today = todayKey();
  const list = await loadPrayerCompletions();
  const existing = list.find((p) => p.prayer === prayer && p.date === today);

  if (existing) {
    const next = list.filter((p) => p.id !== existing.id);
    await savePrayerCompletions(next);
    return false;
  }

  const entry: PrayerCompletion = {
    id: `pr-${Date.now()}`,
    prayer,
    date: today,
    completedAt: new Date().toISOString(),
  };
  await savePrayerCompletions([entry, ...list].slice(0, 500));
  return true;
}

export async function getTodayCompletions(): Promise<PrayerCompletion[]> {
  const today = todayKey();
  return (await loadPrayerCompletions()).filter((p) => p.date === today);
}

export function mergePrayerCompletions(a: PrayerCompletion[], b: PrayerCompletion[]): PrayerCompletion[] {
  const map = new Map<string, PrayerCompletion>();
  for (const item of [...a, ...b]) {
    const key = `${item.prayer}:${item.date}`;
    const existing = map.get(key);
    if (!existing || item.completedAt > existing.completedAt) {
      map.set(key, item);
    }
  }
  return [...map.values()].sort((x, y) => y.completedAt.localeCompare(x.completedAt)).slice(0, 500);
}
