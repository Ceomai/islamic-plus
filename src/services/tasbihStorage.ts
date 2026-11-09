import type { TasbihData, TasbihSession } from '../types';
import { lastDayKeys, localDateKey } from '../utils/date';
import { createSerialQueue } from '../utils/serial';
import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

const EMPTY: TasbihData = { count: 0, total: 0, sessions: [], log: {} };
const MAX_SESSIONS = 200;
const LOG_DAYS = 90;

export async function loadTasbihData(): Promise<TasbihData> {
  const raw = await getJson<Partial<TasbihData>>(storageKeys.tasbih, EMPTY);
  return { count: raw.count ?? 0, total: raw.total ?? 0, sessions: raw.sessions ?? [], log: raw.log ?? {}, dailyGoal: raw.dailyGoal ?? 0 };
}

export async function saveTasbihData(data: TasbihData): Promise<void> {
  await setJson(storageKeys.tasbih, data);
  notifyAppDataChanged();
}

function pruneLog(log: Record<string, number[]>): Record<string, number[]> {
  const keep = new Set(lastDayKeys(LOG_DAYS));
  return Object.fromEntries(Object.entries(log).filter(([k]) => keep.has(k)));
}

// Every change below goes through one queue so fast taps are all counted
const serial = createSerialQueue();

export function setTasbihGoal(goal: number): Promise<TasbihData> {
  return serial(async () => {
    const data = await loadTasbihData();
    const next = { ...data, dailyGoal: Math.max(0, Math.round(goal)) };
    await saveTasbihData(next);
    return next;
  });
}

function withSession(data: TasbihData, count: number, target: number, dhikrId?: string): TasbihSession[] {
  const session: TasbihSession = { id: `tb-${Date.now()}-${data.sessions.length}`, count, target, completedAt: new Date().toISOString(), dhikrId };
  return [session, ...data.sessions].slice(0, MAX_SESSIONS);
}

export interface TasbihTapResult {
  data: TasbihData;
  /** The round's count after this tap (0 once the round is complete) */
  count: number;
  /** This tap reached the target: the round is in history and the next one starts from zero */
  roundCompleted: boolean;
}

/**
 * One tap: advances the current round, records the hour it happened in and, when the round reaches
 * `target`, keeps it in history and starts the next one, all in one step. Done as two steps, two
 * quick taps at the target could both complete the round.
 */
export function incrementTasbih(target: number, dhikrId?: string, at: Date = new Date()): Promise<TasbihTapResult> {
  return serial(async () => {
    const data = await loadTasbihData();
    const day = localDateKey(at);
    const log = { ...(data.log ?? {}) };
    const hours = [...(log[day] ?? new Array(24).fill(0))];
    hours[at.getHours()] += 1;
    log[day] = hours;
    const count = data.count + 1;
    const roundCompleted = count >= target;
    const next: TasbihData = {
      ...data,
      count: roundCompleted ? 0 : count,
      total: data.total + 1,
      log: pruneLog(log),
      ...(roundCompleted ? { sessions: withSession(data, count, target, dhikrId) } : {}),
    };
    await saveTasbihData(next);
    return { data: next, count: next.count, roundCompleted };
  });
}

/** Manual reset: an unfinished round is still kept in history so the lifetime numbers stay true. */
export function resetTasbihSession(target: number, dhikrId?: string): Promise<TasbihData> {
  return serial(async () => {
    const data = await loadTasbihData();
    const sessions = data.count > 0 ? withSession(data, data.count, target, dhikrId) : data.sessions;
    const next = { ...data, count: 0, sessions };
    await saveTasbihData(next);
    return next;
  });
}

export interface TasbihSummary {
  today: number;
  week: number;
  total: number;
  /** Sum per hour of day over the chosen period */
  byHour: number[];
  /** Per day for the last 7 days, oldest first */
  byDay: { key: string; count: number }[];
}

export function summarizeTasbih(data: TasbihData, periodDays: number): TasbihSummary {
  const log = data.log ?? {};
  const sumDay = (k: string) => (log[k] ?? []).reduce((a, b) => a + b, 0);
  const week = lastDayKeys(7);
  const period = lastDayKeys(periodDays);
  const byHour = new Array(24).fill(0);
  for (const k of period) (log[k] ?? []).forEach((v, h) => (byHour[h] += v));
  return {
    today: sumDay(localDateKey()),
    week: week.reduce((a, k) => a + sumDay(k), 0),
    total: data.total,
    byHour,
    byDay: week.map((key) => ({ key, count: sumDay(key) })),
  };
}
