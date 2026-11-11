import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useDayKey } from '../../hooks/useClock';
import { fireAndForget } from '../../services/fireAndForget';
import { ackPendingPrayerMarks, handlePrayerResponse, peekPendingPrayerMarks } from '../../services/prayerAction';
import { getTodayCompletions, loadPrayerCompletions, markPrayerCompleted, togglePrayerCompletion } from '../../services/prayerTracking';
import { updatePrayerStreak } from '../../services/statistics';
import { getStorageUser } from '../../services/storage';
import type { ActivityStats, AuthSession, PrayerCompletion, PrayerName } from '../../types';
import type { ActivityType, PrayerDaySlice } from './slices';

interface Deps {
  session: AuthSession | null;
  loading: boolean;
  trackActivity: (type: ActivityType, report?: boolean, day?: string) => Promise<void>;
  setStats: (stats: ActivityStats) => void;
}

/** Today's prayed prayers, including "prayed" taps on notifications; rolls over at local midnight. */
export function usePrayerDayState({ session, loading, trackActivity, setStats }: Deps) {
  const [todayPrayers, setTodayPrayers] = useState<PrayerCompletion[]>([]);

  const refreshTodayPrayers = useCallback(async () => {
    setTodayPrayers(await getTodayCompletions());
  }, []);

  const refreshStreak = useCallback(async () => {
    // Streak depends on full days of prayers, so it is recomputed on every change (including un-marking)
    setStats(await updatePrayerStreak(await loadPrayerCompletions()));
  }, [setStats]);

  // A new day starts with nothing prayed: roll over at midnight while the app stays open, and on
  // every return to the foreground
  const dayKey = useDayKey();
  const shownDay = useRef(dayKey);
  useEffect(() => {
    if (shownDay.current === dayKey) return;
    shownDay.current = dayKey;
    fireAndForget(refreshTodayPrayers(), 'prayers.rollover');
  }, [dayKey, refreshTodayPrayers]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fireAndForget(refreshTodayPrayers(), 'prayers.foreground');
    });
    return () => sub.remove();
  }, [refreshTodayPrayers]);

  const togglePrayerComplete = useCallback(
    async (prayer: PrayerName) => {
      const added = await togglePrayerCompletion(prayer);
      if (added) await trackActivity('prayer');
      await refreshStreak();
      await refreshTodayPrayers();
    },
    [trackActivity, refreshStreak, refreshTodayPrayers]
  );

  // "Prayed" taps on notifications wait in a queue (the Android task runs without this account).
  // Only this account's marks are applied, and they leave the queue once they are stored
  const applyPendingPrayerMarks = useCallback(async () => {
    const scope = session ? getStorageUser() : null;
    if (!scope) return;
    const marks = await peekPendingPrayerMarks(scope);
    if (marks.length === 0) return;
    const added: typeof marks = [];
    for (const m of marks) {
      if (await markPrayerCompleted(m.prayer, m.date)) added.push(m);
    }
    await ackPendingPrayerMarks(marks);
    if (added.length === 0) return;
    // Points go on the day of the prayer, which is not today when the tap is applied later
    for (const m of added) await trackActivity('prayer', true, m.date);
    await refreshStreak();
    await refreshTodayPrayers();
  }, [session, trackActivity, refreshStreak, refreshTodayPrayers]);

  useEffect(() => {
    if (loading || !session || Platform.OS === 'web') return;
    // Cold start from the action (iOS opens the app for it)
    const last = Notifications.getLastNotificationResponse();
    const coldStart = last ? handlePrayerResponse(last).then(() => Notifications.clearLastNotificationResponse()) : Promise.resolve();
    fireAndForget(coldStart.then(applyPendingPrayerMarks), 'prayers.coldStart');
    const responses = Notifications.addNotificationResponseReceivedListener((r) => {
      fireAndForget(
        handlePrayerResponse(r).then((handled) => (handled ? applyPendingPrayerMarks() : undefined)),
        'prayers.response'
      );
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') fireAndForget(applyPendingPrayerMarks(), 'prayers.pending');
    });
    return () => {
      responses.remove();
      appState.remove();
    };
  }, [loading, session, applyPendingPrayerMarks]);

  const prayerDayValue = useMemo<PrayerDaySlice>(
    () => ({ todayPrayers, togglePrayerComplete, refreshTodayPrayers }),
    [todayPrayers, togglePrayerComplete, refreshTodayPrayers]
  );

  return { refreshTodayPrayers, prayerDayValue };
}
