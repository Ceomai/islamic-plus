import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

/** Missed (qada) prayers still owed. Witr is wajib in the Hanafi school, so it is tracked too. */
export const KAZA_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as const;
export type KazaPrayer = (typeof KAZA_PRAYERS)[number];

export interface KazaData {
  counts: Record<KazaPrayer, number>;
  /** Total made up since tracking started */
  madeUp: number;
  updatedAt: string;
}

export const EMPTY_KAZA: KazaData = {
  counts: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  madeUp: 0,
  updatedAt: new Date(0).toISOString(),
};

export async function loadKaza(): Promise<KazaData> {
  const raw = await getJson<Partial<KazaData> | null>(storageKeys.kaza, null);
  return { ...EMPTY_KAZA, ...raw, counts: { ...EMPTY_KAZA.counts, ...(raw?.counts ?? {}) } };
}

async function save(data: KazaData): Promise<KazaData> {
  const next = { ...data, updatedAt: new Date().toISOString() };
  await setJson(storageKeys.kaza, next);
  notifyAppDataChanged();
  return next;
}

/** +1 adds an owed prayer, -1 records one made up (never below zero). */
export function applyKazaChange(data: KazaData, prayer: KazaPrayer, delta: 1 | -1): KazaData {
  const current = data.counts[prayer];
  if (delta === -1 && current === 0) return data;
  return {
    ...data,
    counts: { ...data.counts, [prayer]: current + delta },
    madeUp: data.madeUp + (delta === -1 ? 1 : 0),
  };
}

export async function changeKaza(prayer: KazaPrayer, delta: 1 | -1): Promise<KazaData> {
  return save(applyKazaChange(await loadKaza(), prayer, delta));
}

/**
 * Rough estimate for "I didn't pray for N years / days": one of each prayer per day.
 * Adds to what is already recorded.
 */
export function estimateKaza(data: KazaData, years: number, days: number, includeWitr: boolean): KazaData {
  const total = Math.max(0, Math.round(years * 365 + days));
  const counts = { ...data.counts };
  for (const p of KAZA_PRAYERS) {
    if (p === 'witr' && !includeWitr) continue;
    counts[p] += total;
  }
  return { ...data, counts };
}

export async function addKazaEstimate(years: number, days: number, includeWitr: boolean): Promise<KazaData> {
  return save(estimateKaza(await loadKaza(), years, days, includeWitr));
}

export async function resetKaza(): Promise<KazaData> {
  return save({ ...EMPTY_KAZA });
}

export const kazaRemaining = (data: KazaData) => KAZA_PRAYERS.reduce((sum, p) => sum + data.counts[p], 0);
