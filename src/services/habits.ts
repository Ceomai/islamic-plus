import type { SpiritualHabit } from '../types';

export type NewHabit = Omit<SpiritualHabit, 'id' | 'completedDates'>;

/** A new habit with nothing completed yet; the id is the creation time (as stored by earlier builds). */
export function createHabit(input: NewHabit, now: number = Date.now()): SpiritualHabit {
  return { ...input, id: String(now), completedDates: [] };
}

/**
 * Marks or unmarks `day` (YYYY-MM-DD) on one habit. `completed` is true when the day was added,
 * which is when the activity counts towards statistics.
 */
export function toggleHabitDate(
  habits: SpiritualHabit[],
  id: string,
  day: string
): { habits: SpiritualHabit[]; completed: boolean } {
  let completed = false;
  const next = habits.map((h) => {
    if (h.id !== id) return h;
    const has = h.completedDates.includes(day);
    completed = !has;
    return { ...h, completedDates: has ? h.completedDates.filter((d) => d !== day) : [...h.completedDates, day] };
  });
  return { habits: next, completed };
}
