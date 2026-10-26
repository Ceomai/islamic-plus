import type { ZakatCalculationRecord } from '../types';
import type { ZakatInput, ZakatResult } from './zakat';
import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

const MAX_HISTORY = 20;

export async function loadZakatHistory(): Promise<ZakatCalculationRecord[]> {
  return getJson(storageKeys.zakatHistory, []);
}

export async function saveZakatCalculation(
  input: ZakatInput,
  result: ZakatResult
): Promise<ZakatCalculationRecord> {
  const entry: ZakatCalculationRecord = {
    id: `zk-${Date.now()}`,
    calculatedAt: new Date().toISOString(),
    input: input as unknown as Record<string, unknown>,
    result: result as unknown as Record<string, unknown>,
    isObligatory: result.isObligatory,
  };
  const list = await loadZakatHistory();
  const next = [entry, ...list].slice(0, MAX_HISTORY);
  await setJson(storageKeys.zakatHistory, next);
  notifyAppDataChanged();
  return entry;
}

export function mergeZakatHistory(a: ZakatCalculationRecord[], b: ZakatCalculationRecord[]): ZakatCalculationRecord[] {
  const map = new Map<string, ZakatCalculationRecord>();
  for (const item of [...a, ...b]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()].sort((x, y) => y.calculatedAt.localeCompare(x.calculatedAt)).slice(0, MAX_HISTORY);
}
