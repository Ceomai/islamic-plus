import type { ActivityStats, PrayerCompletion, SpiritualHabit } from '../types';
import { addDays, lastDayKeys, localDateKey } from '../utils/date';
import { getJson, setJson, storageKeys } from './storage';

const DEFAULT_STATS: ActivityStats = {
  tasbihTotal: 0,
  habitsCompletedTotal: 0,
  duasReadCount: 0,
  quranSessions: 0,
  prayerStreakDays: 0,
  lastActiveDate: '',
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  dailyPoints: {},
};

const DAILY_PRAYER_COUNT = 5;
const KEEP_DAYS = 30;
const POINTS: Record<'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer', number> = {
  tasbih: 1,
  habit: 12,
  dua: 8,
  quran: 15,
  prayer: 10,
};

/** Last 7 days of points (oldest first), capped at 100 for the chart. */
export function weeklyFromDaily(dailyPoints: Record<string, number> = {}): number[] {
  return lastDayKeys(7).map((k) => Math.min(100, dailyPoints[k] ?? 0));
}

export async function loadStats(): Promise<ActivityStats> {
  const stats = await getJson(storageKeys.stats, DEFAULT_STATS);
  // Stats saved before per-day points existed keep their old chart until new activity arrives
  return stats.dailyPoints ? { ...stats, weeklyActivity: weeklyFromDaily(stats.dailyPoints) } : stats;
}

export async function saveStats(stats: ActivityStats): Promise<void> {
  await setJson(storageKeys.stats, stats);
}

export async function recordActivity(
  type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer',
  amount = 1
): Promise<ActivityStats> {
  const stats = await loadStats();
  const today = localDateKey();
  const next: ActivityStats = { ...stats, lastActiveDate: today };

  if (type === 'tasbih') next.tasbihTotal += amount;
  if (type === 'habit') next.habitsCompletedTotal += amount;
  if (type === 'dua') next.duasReadCount += amount;
  if (type === 'quran') next.quranSessions += amount;

  const keep = new Set(lastDayKeys(KEEP_DAYS));
  const daily = Object.fromEntries(Object.entries(stats.dailyPoints ?? {}).filter(([k]) => keep.has(k)));
  daily[today] = (daily[today] ?? 0) + POINTS[type] * amount;
  next.dailyPoints = daily;
  next.weeklyActivity = weeklyFromDaily(daily);

  await saveStats(next);
  return next;
}

/**
 * Consecutive days with all five daily prayers marked. Today counts once it is complete;
 * until then the streak continues from yesterday, so it does not drop to 0 every morning.
 */
export function computePrayerStreak(completions: PrayerCompletion[], today: Date = new Date()): number {
  const perDay = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!perDay.has(c.date)) perDay.set(c.date, new Set());
    perDay.get(c.date)!.add(c.prayer);
  }
  const complete = (d: Date) => (perDay.get(localDateKey(d))?.size ?? 0) >= DAILY_PRAYER_COUNT;

  let day = complete(today) ? today : addDays(today, -1);
  let streak = 0;
  while (complete(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export async function updatePrayerStreak(completions: PrayerCompletion[]): Promise<ActivityStats> {
  const stats = await loadStats();
  const next = { ...stats, prayerStreakDays: computePrayerStreak(completions) };
  await saveStats(next);
  return next;
}

export function computeHabitScore(habits: SpiritualHabit[]): number {
  if (habits.length === 0) return 0;
  const week = new Set(lastDayKeys(7));
  let total = 0;
  let done = 0;
  for (const h of habits) {
    total += h.targetPerWeek;
    done += Math.min(h.targetPerWeek, h.completedDates.filter((d) => week.has(d)).length);
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function statsSummary(stats: ActivityStats, habitScore: number) {
  const weeklyAvg = Math.round(stats.weeklyActivity.reduce((a, b) => a + b, 0) / stats.weeklyActivity.length);
  return {
    weeklyAvg,
    habitScore,
    totalEngagement: stats.tasbihTotal + stats.duasReadCount + stats.habitsCompletedTotal,
  };
}
