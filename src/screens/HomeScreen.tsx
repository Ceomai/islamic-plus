import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DailyDuaCard } from '../components/DailyDuaCard';
import { HomeAppIcon } from '../components/HomeAppIcon';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { RamadanCard } from '../components/prayer/RamadanCard';
import { TodayPrayersModule } from '../components/prayer/TodayPrayersModule';
import { getHomeFeature } from '../constants/homeFeatures';
import { useAppLocation, usePrayerDay, useReading, useSettings } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDayKey } from '../hooks/useClock';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useOptimisticSet } from '../hooks/useOptimisticSet';
import { useNextPrayer, usePrayerDays } from '../hooks/usePrayerDays';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { gregorianToHijri } from '../services/hijriCalendar';
import { ramadanWindow } from '../services/ramadan';
import { launcherColumns } from '../theme/tokens';
import { confirm } from '../utils/confirm';
import { dateFromKey } from '../utils/date';
import type { HomeFeatureId, PrayerName } from '../types';
import { AppText, Enter, ListRow, SectionHeader, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const COUNTDOWN_TICK_MS = 30_000;
const ICON_BUTTON = 44;

export function HomeScreen({ navigation }: Props) {
  const { location, refreshLocation } = useAppLocation();
  const { loading, settings } = useSettings();
  const { quranProgress, hadithProgress } = useReading();
  const { todayPrayers, togglePrayerComplete, refreshTodayPrayers } = usePrayerDay();
  const { canAccess } = useFeatureAccess();
  const { logout } = useAuth();
  const { colors, space, layout, motion } = useTheme();
  const { width } = useWindowDimensions();
  const columns = launcherColumns(width);
  const { t, lang } = useTranslation();

  // Once when the screen opens: a city chosen by hand stays until the user picks "use my location" again
  const refreshOnOpen = useEffectEvent(() => {
    if (!location?.cityId) void refreshLocation();
    void refreshTodayPrayers();
  });
  useEffect(() => {
    refreshOnOpen();
  }, []);

  const openFeature = (id: HomeFeatureId) => {
    if (!canAccess(id)) {
      // Only cloud sync is guest-locked; signing in leaves the guest session for the auth screen
      void confirm({
        title: t('home.guestLocked'),
        message: t('auth.guestBanner'),
        confirm: t('auth.signInOrRegister'),
        cancel: t('account.cancel'),
      }).then((ok) => {
        if (ok) void logout();
      });
      return;
    }
    const def = getHomeFeature(id);
    if (!def?.route) return;
    // @ts-expect-error dynamic route params
    navigation.navigate(def.route, def.routeParams);
  };

  // The day's schedule is recomputed when the day changes; the countdown ticks in its own component
  const dayKey = useDayKey();
  const hijri = useMemo(() => gregorianToHijri(dateFromKey(dayKey), lang), [dayKey, lang]);
  const prayerDays = usePrayerDays(location, settings.calculationMethod, settings.madhab, dayKey);
  const prayerDates = prayerDays?.today ?? null;
  // Re-renders the screen only when the next prayer changes (after Isha: tomorrow's Fajr)
  const nextPrayer = useNextPrayer(prayerDays, COUNTDOWN_TICK_MS);

  const storedPrayers = useMemo(() => new Set(todayPrayers.map((p) => p.prayer)), [todayPrayers]);
  // A tap shows the prayer as prayed at once; storage and the day's count catch up behind it
  const { shown: completedPrayers, toggle: togglePrayerShown } = useOptimisticSet(storedPrayers);
  const markPrayer = (p: PrayerName) => {
    if (!completedPrayers.has(p)) void Haptics.selectionAsync();
    void togglePrayerShown(p, () => togglePrayerComplete(p));
  };

  // Content that replaces the loading placeholder fades in; content that was there from the start doesn't
  const [showedSkeleton, setShowedSkeleton] = useState(loading);
  if (loading && !showedSkeleton) setShowedSkeleton(true);

  // After Isha the day's times are all past: show tomorrow's under them (today's stay markable)
  const tomorrowDates = nextPrayer?.isTomorrow ? (prayerDays?.tomorrow ?? null) : null;

  // Ramadan card: suhoor/iftar countdown during Ramadan, days left in the month before it
  const ramadan = useMemo(() => ramadanWindow(dateFromKey(dayKey)), [dayKey]);
  const showRamadan = ramadan.inRamadan || ramadan.daysUntil <= 30;

  if (loading) return <HomeSkeleton label={t('common.loading')} />;

  const order = settings.homeLauncher.order;
  const modules = order.filter((id) => getHomeFeature(id)?.isModule);
  const apps = order.filter((id) => {
    const def = getHomeFeature(id);
    return def && !def.isModule;
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Enter animate={showedSkeleton} duration={motion.duration.medium} style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[8] }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, { marginBottom: space[5] }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="callout" tone="secondary">
                {t('home.greeting')}
              </AppText>
              <Pressable
                onPress={() => navigation.navigate('CityPicker')}
                accessibilityRole="button"
                accessibilityHint={t('city.title')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: layout.minTouch }}
              >
                <AppText variant="title" numberOfLines={1} tone={location ? 'default' : 'brand'} style={{ flexShrink: 1 }}>
                  {location ? location.city ?? t('home.yourLocation') : t('home.tapLocation')}
                </AppText>
                <Ionicons name="chevron-down" size={18} color={location ? colors.textSecondary : colors.primaryText} />
              </Pressable>
              <AppText variant="caption" tone="secondary">
                {hijri.formatted}
              </AppText>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel={t('home.openSettings')}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </View>

          {modules.map((id) =>
            id === 'module_prayer_times' ? (
              <TodayPrayersModule
                key={id}
                hasLocation={!!location}
                nextPrayer={nextPrayer}
                today={prayerDates}
                tomorrow={tomorrowDates}
                completed={completedPrayers}
                countdownTickMs={COUNTDOWN_TICK_MS}
                onMarkPrayer={markPrayer}
                onChooseCity={() => navigation.navigate('CityPicker')}
              />
            ) : (
              <DailyDuaCard key={id} onOpenDua={(duaId) => navigation.navigate('DuaDetail', { duaId })} />
            )
          )}

          {showRamadan && <RamadanCard ramadan={ramadan} days={prayerDays} tickMs={COUNTDOWN_TICK_MS} onPress={() => openFeature('imsakiye')} />}

          {(quranProgress.lastRead || hadithProgress.lastRead) && (
            <>
              <SectionHeader title={t('home.continueReading')} />
              <Surface padding={space[1]} style={{ paddingHorizontal: space[4] }}>
                {quranProgress.lastRead && (
                  <ListRow
                    icon="book-outline"
                    title={quranProgress.lastRead.surahName}
                    subtitle={`${t('reading.ayah')} ${quranProgress.lastRead.ayahNumber}`}
                    onPress={() => openFeature('quran')}
                    divider={!!hadithProgress.lastRead}
                  />
                )}
                {hadithProgress.lastRead && (
                  <ListRow
                    icon="document-text-outline"
                    title={hadithProgress.lastRead.collectionName}
                    subtitle={t('reading.continueHadith')}
                    onPress={() => openFeature('hadith')}
                  />
                )}
              </Surface>
            </>
          )}

          <SectionHeader
            title={t('home.myApps')}
            actionLabel={t('home.editApps')}
            onAction={() => navigation.navigate('HomeLauncherEdit')}
          />
          <View style={[styles.grid, { marginHorizontal: -4 }]}>
            {apps.map((id) => {
              const def = getHomeFeature(id)!;
              return (
                <HomeAppIcon
                  key={id}
                  icon={def.icon}
                  category={def.category}
                  label={t(def.titleKey)}
                  locked={!canAccess(id)}
                  columns={columns}
                  onPress={() => openFeature(id)}
                />
              );
            })}
          </View>
        </ScrollView>
      </Enter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  iconButton: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    borderRadius: ICON_BUTTON / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
