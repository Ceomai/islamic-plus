import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import {
  ActivityProvider,
  AIChatProvider,
  AppearanceProvider,
  FamilyProvider,
  HabitsProvider,
  LanguageProvider,
  LocationProvider,
  PrayerDayProvider,
  ReadingProvider,
  SettingsProvider,
  StatsProvider,
  SyncProvider,
  useActivity,
  useAIChat,
  useAppearance,
  useAppLocation,
  useFamily,
  useHabits,
  usePrayerDay,
  useReading,
  useSettings,
  useStats,
  useSync,
} from './app/slices';
import { useActivityState } from './app/useActivityState';
import { useAIChatState } from './app/useAIChatState';
import { useCloudSync } from './app/useCloudSync';
import { useFamilyState } from './app/useFamilyState';
import { useHabitsState } from './app/useHabitsState';
import { useInitialLoad } from './app/useInitialLoad';
import { useLocationState } from './app/useLocationState';
import { usePrayerDayState } from './app/usePrayerDayState';
import { usePrayerSchedule } from './app/usePrayerSchedule';
import { useReadingState } from './app/useReadingState';
import { useSettingsState } from './app/useSettingsState';

export {
  useActivity,
  useAIChat,
  useAppearance,
  useAppLanguage,
  useAppLocation,
  useFamily,
  useHabits,
  usePrayerDay,
  useReading,
  useSettings,
  useStats,
  useSync,
} from './app/slices';

/**
 * Owns the app's state and publishes it in slices (see app/slices.ts). Each slice value is
 * memoized, so a change reaches only the screens that read that slice.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  // True until the stored data is read (useInitialLoad below ends it)
  const [loading, setLoading] = useState(true);

  const settingsState = useSettingsState(loading);
  const { settings, settingsRef } = settingsState;
  const locationState = useLocationState(settingsRef);
  const activityState = useActivityState();
  const habitsState = useHabitsState(activityState.refreshStats);
  const familyState = useFamilyState(settingsRef, settingsState.updateSettings);
  const readingState = useReadingState(settings.activeFamilyMemberId, session);
  const aiChatState = useAIChatState();
  const prayerDay = usePrayerDayState({
    session,
    loading,
    trackActivity: activityState.trackActivity,
    setStats: activityState.setStats,
  });

  useInitialLoad(session, setLoading, {
    setSettings: settingsState.setSettings,
    setHabits: habitsState.setHabits,
    setLocation: locationState.setLocation,
    setFamily: familyState.setFamily,
    setStats: activityState.setStats,
    setAiMessages: aiChatState.setAiMessages,
    loadReadingProgress: readingState.loadReadingProgress,
    refreshTodayPrayers: prayerDay.refreshTodayPrayers,
  });

  usePrayerSchedule(settings, locationState.location, settingsRef, locationState.locationRef);

  const syncValue = useCloudSync({
    session,
    authReady,
    loading,
    activeFamilyMemberId: settings.activeFamilyMemberId,
    settingsRef,
    habitsRef: habitsState.habitsRef,
    familyRef: familyState.familyRef,
    statsRef: activityState.statsRef,
    locationRef: locationState.locationRef,
    setSettings: settingsState.setSettings,
    setHabits: habitsState.setHabits,
    setFamily: familyState.setFamily,
    setStats: activityState.setStats,
    setLocation: locationState.setLocation,
    setReadingProgress: readingState.setReadingProgress,
    updateSettings: settingsState.updateSettings,
    refreshTodayPrayers: prayerDay.refreshTodayPrayers,
    refreshStats: activityState.refreshStats,
  });

  return (
    <SettingsProvider value={settingsState.settingsValue}>
      <AppearanceProvider value={settingsState.appearanceValue}>
        <LanguageProvider value={settings.appLanguage}>
          <LocationProvider value={locationState.locationValue}>
            <PrayerDayProvider value={prayerDay.prayerDayValue}>
              <StatsProvider value={activityState.statsValue}>
                <ActivityProvider value={activityState.activityValue}>
                  <HabitsProvider value={habitsState.habitsValue}>
                    <FamilyProvider value={familyState.familyValue}>
                      <ReadingProvider value={readingState.readingValue}>
                        <AIChatProvider value={aiChatState.aiChatValue}>
                          <SyncProvider value={syncValue}>{children}</SyncProvider>
                        </AIChatProvider>
                      </ReadingProvider>
                    </FamilyProvider>
                  </HabitsProvider>
                </ActivityProvider>
              </StatsProvider>
            </PrayerDayProvider>
          </LocationProvider>
        </LanguageProvider>
      </AppearanceProvider>
    </SettingsProvider>
  );
}

/**
 * Every slice in one object, as before the split. It re-renders on any app state change: screens
 * on a hot path read the narrow hooks (useSettings, useAppLocation, …) instead.
 */
export function useApp() {
  return {
    ...useSettings(),
    ...useAppearance(),
    ...useAppLocation(),
    ...usePrayerDay(),
    ...useStats(),
    ...useActivity(),
    ...useHabits(),
    ...useFamily(),
    ...useReading(),
    ...useAIChat(),
    ...useSync(),
  };
}
