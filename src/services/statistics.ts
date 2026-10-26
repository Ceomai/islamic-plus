import type { ActivityStats, SpiritualHabit } from '../types';
import { getJson, setJson, storageKeys } from './storage';

const DEFAULT_STATS: ActivityStats = {
  tasbihTotal: 0,
  habitsCompletedTotal: 0,
  duasReadCount: 0,
  quranSessions: 0,
  prayerStreakDays: 0,
  lastActiveDate: '',
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
};

export async function loadStats(): Promise<ActivityStats> {
  return getJson(storageKeys.stats, DEFAULT_STATS);
}

export async function saveStats(stats: ActivityStats): Promise<void> {
  await setJson(storageKeys.stats, stats);
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function bumpWeekly(stats: ActivityStats, points: number): ActivityStats {
  const weekly = [...stats.weeklyActivity];
  weekly.shift();
  weekly.push(Math.min(100, (weekly[weekly.length - 1] ?? 0) + points));
  return { ...stats, weeklyActivity: weekly };
}

export async function recordActivity(
  type: 'tasbih' | 'habit' | 'dua' | 'quran' | 'prayer',
  amount = 1
): Promise<ActivityStats> {
  const stats = await loadStats();
  const today = todayKey();
  let next = { ...stats, lastActiveDate: today };

  if (type === 'tasbih') next.tasbihTotal += amount;
  if (type === 'habit') next.habitsCompletedTotal += amount;
  if (type === 'dua') next.duasReadCount += amount;
  if (type === 'quran') next.quranSessions += amount;
  if (type === 'prayer') {
    if (stats.lastActiveDate === today) {
      // same day, no streak bump
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().split('T')[0];
      next.prayerStreakDays = stats.lastActiveDate === yKey ? stats.prayerStreakDays + 1 : 1;
    }
  }

  next = bumpWeekly(next, type === 'tasbih' ? 5 : 12);
  await saveStats(next);
  return next;
}

export function computeHabitScore(habits: SpiritualHabit[]): number {
  if (habits.length === 0) return 0;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  let total = 0;
  let done = 0;
  for (const h of habits) {
    total += h.targetPerWeek;
    done += h.completedDates.filter((d) => new Date(d) >= weekStart).length;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function statsSummary(stats: ActivityStats, habitScore: number) {
  const weeklyAvg = Math.round(
    stats.weeklyActivity.reduce((a, b) => a + b, 0) / stats.weeklyActivity.length
  );
  return {
    weeklyAvg,
    habitScore,
    totalEngagement: stats.tasbihTotal + stats.duasReadCount + stats.habitsCompletedTotal,
  };
}
