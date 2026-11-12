import { useCallback, useMemo } from 'react';
import { useRefState } from '../../hooks/useRefState';
import { trackFeatureAction } from '../../services/cloudAnalytics';
import { fireAndForget } from '../../services/fireAndForget';
import { loadStats, recordActivity } from '../../services/statistics';
import { getJson, setJson, storageKeys } from '../../services/storage';
import { notifyAppDataChanged } from '../../services/userDataCloud';
import type { ActivityStats } from '../../types';
import type { ActivitySlice, ActivityType, StatsSlice } from './slices';

const EMPTY_STATS: ActivityStats = {
  tasbihTotal: 0,
  habitsCompletedTotal: 0,
  duasReadCount: 0,
  quranSessions: 0,
  prayerStreakDays: 0,
  lastActiveDate: '',
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
};

/** Activity statistics and the actions that add to them. */
export function useActivityState() {
  const [stats, setStats, statsRef] = useRefState<ActivityStats>(EMPTY_STATS);

  const refreshStats = useCallback(async () => {
    setStats(await loadStats());
  }, [setStats]);

  const trackActivity = useCallback(
    async (type: ActivityType, report = true, day?: string) => {
      setStats(await recordActivity(type, 1, day));
      if (report) fireAndForget(trackFeatureAction(type, 'activity_recorded'), 'analytics.activity');
      notifyAppDataChanged();
    },
    [setStats]
  );

  const markDuaRead = useCallback(
    async (duaId: string) => {
      const progress = await getJson<Record<string, number>>(storageKeys.duaProgress, {});
      progress[duaId] = (progress[duaId] ?? 0) + 1;
      await setJson(storageKeys.duaProgress, progress);
      await trackActivity('dua');
      notifyAppDataChanged();
    },
    [trackActivity]
  );

  const statsValue = useMemo<StatsSlice>(() => ({ stats, refreshStats }), [stats, refreshStats]);
  const activityValue = useMemo<ActivitySlice>(() => ({ trackActivity, markDuaRead }), [trackActivity, markDuaRead]);

  return { stats, setStats, statsRef, refreshStats, trackActivity, statsValue, activityValue };
}
