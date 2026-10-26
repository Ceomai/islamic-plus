import type { TasbihData, TasbihSession } from '../types';
import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

const EMPTY: TasbihData = { count: 0, total: 0, sessions: [] };

export async function loadTasbihData(): Promise<TasbihData> {
  const raw = await getJson<{ count: number; total: number; sessions?: TasbihSession[] }>(
    storageKeys.tasbih,
    EMPTY
  );
  return { count: raw.count, total: raw.total, sessions: raw.sessions ?? [] };
}

export async function saveTasbihData(data: TasbihData): Promise<void> {
  await setJson(storageKeys.tasbih, data);
  notifyAppDataChanged();
}

export async function incrementTasbih(): Promise<TasbihData> {
  const data = await loadTasbihData();
  const next = { ...data, count: data.count + 1, total: data.total + 1 };
  await saveTasbihData(next);
  return next;
}

export async function resetTasbihSession(target: number): Promise<TasbihData> {
  const data = await loadTasbihData();
  let sessions = data.sessions;

  if (data.count > 0) {
    const session: TasbihSession = {
      id: `tb-${Date.now()}`,
      count: data.count,
      target,
      completedAt: new Date().toISOString(),
    };
    sessions = [session, ...sessions].slice(0, 100);
  }

  const next = { count: 0, total: data.total, sessions };
  await saveTasbihData(next);
  return next;
}

export async function setTasbihTarget(target: number): Promise<TasbihData> {
  return resetTasbihSession(target);
}

export function mergeTasbihData(a: TasbihData, b: TasbihData): TasbihData {
  const sessionMap = new Map<string, TasbihSession>();
  for (const s of [...a.sessions, ...b.sessions]) {
    if (!sessionMap.has(s.id)) sessionMap.set(s.id, s);
  }
  return {
    count: a.count,
    total: Math.max(a.total, b.total),
    sessions: [...sessionMap.values()].sort((x, y) => y.completedAt.localeCompare(x.completedAt)).slice(0, 100),
  };
}
