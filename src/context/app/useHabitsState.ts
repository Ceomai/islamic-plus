import { useCallback, useMemo } from 'react';
import { useRefState } from '../../hooks/useRefState';
import { fireAndForget } from '../../services/fireAndForget';
import { createHabit, toggleHabitDate, type NewHabit } from '../../services/habits';
import { computeHabitScore, recordActivity } from '../../services/statistics';
import { setJson, storageKeys } from '../../services/storage';
import { recordDeletion } from '../../services/tombstones';
import { notifyAppDataChanged } from '../../services/userDataCloud';
import type { SpiritualHabit } from '../../types';
import { animateNextLayout } from '../../ui/motion';
import { localDateKey } from '../../utils/date';
import type { HabitsSlice } from './slices';

/** Spiritual habits; every change is stored and offered to the cloud copy. */
export function useHabitsState(refreshStats: () => Promise<void>) {
  const [habits, setHabits, habitsRef] = useRefState<SpiritualHabit[]>([]);

  const saveHabits = useCallback(
    (next: SpiritualHabit[]) => {
      setHabits(next);
      fireAndForget(setJson(storageKeys.habits, next), 'habits.save');
      notifyAppDataChanged();
    },
    [setHabits]
  );

  const addHabit = useCallback(
    async (habit: NewHabit) => {
      saveHabits([...habitsRef.current, createHabit(habit)]);
    },
    [habitsRef, saveHabits]
  );

  const toggleHabitToday = useCallback(
    async (id: string) => {
      const { habits: next, completed } = toggleHabitDate(habitsRef.current, id, localDateKey());
      saveHabits(next);
      // The stats are read back once the completion is recorded, so they include it
      const updateStats = async () => {
        if (completed) await recordActivity('habit');
        await refreshStats();
      };
      fireAndForget(updateStats(), 'habits.stats');
    },
    [habitsRef, saveHabits, refreshStats]
  );

  const removeHabit = useCallback(
    async (id: string) => {
      await recordDeletion('habits', id);
      // The row is removed after the await above, so the list animation is set up here, right before it
      animateNextLayout();
      saveHabits(habitsRef.current.filter((h) => h.id !== id));
    },
    [habitsRef, saveHabits]
  );

  // Not memoized on the habits: the score covers the last 7 days, so it also moves with the date
  const habitScore = computeHabitScore(habits);
  const habitsValue = useMemo<HabitsSlice>(
    () => ({ habits, habitScore, addHabit, toggleHabitToday, removeHabit }),
    [habits, habitScore, addHabit, toggleHabitToday, removeHabit]
  );

  return { habits, setHabits, habitsRef, habitsValue };
}
