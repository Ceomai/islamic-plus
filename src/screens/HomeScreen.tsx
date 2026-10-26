import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeAppIcon } from '../components/HomeAppIcon';
import { HomeWidgetModule } from '../components/HomeWidgetModule';
import { getHomeFeature } from '../constants/homeFeatures';
import { useApp } from '../context/AppContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { gregorianToHijri } from '../services/hijriCalendar';
import { fastCountdown, formatDuration, ramadanWindow } from '../services/ramadan';
import { addDays } from '../utils/date';
import { formatClock, getNextPrayer, getPrayerDates } from '../services/prayerTimes';
import type { HomeFeatureId, PrayerName } from '../types';
import { AppText, ListRow, SectionHeader, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DAILY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const COUNTDOWN_TICK_MS = 30_000;

export function HomeScreen({ navigation }: Props) {
  const {
    location,
    refreshLocation,
    loading,
    settings,
    stats,
    quranProgress,
    hadithProgress,
    todayPrayers,
    togglePrayerComplete,
    refreshTodayPrayers,
  } = useApp();
  const { canAccess } = useFeatureAccess();
  const { colors, space } = useTheme();
  const { t, prayer, lang } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    refreshLocation();
    void refreshTodayPrayers();
  }, []);

  // Keep the countdown (and the day's schedule after midnight) current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const openFeature = (id: HomeFeatureId) => {
    if (!canAccess(id)) {
      Alert.alert(t('home.guestLocked'), t('auth.guestBanner'));
      return;
    }
    const def = getHomeFeature(id);
    if (!def?.route) return;
    // @ts-expect-error dynamic route params
    navigation.navigate(def.route, def.routeParams);
  };

  const today = new Date(now).toDateString();
  const hijri = useMemo(() => gregorianToHijri(new Date(now), lang), [today, lang]);

  const prayerDates = useMemo(() => {
    if (!location) return null;
    return getPrayerDates(location.latitude, location.longitude, new Date(now), settings.calculationMethod, settings.madhab);
  }, [location, settings.calculationMethod, settings.madhab, today]);

  const nextPrayer = useMemo(() => {
    if (!location) return null;
    return getNextPrayer(location.latitude, location.longitude, settings.calculationMethod, settings.madhab);
  }, [location, settings.calculationMethod, settings.madhab, now]);

  const completedPrayers = useMemo(() => new Set(todayPrayers.map((p) => p.prayer)), [todayPrayers]);

  // Ramadan card: suhoor/iftar countdown during Ramadan, days left in the month before it
  const ramadan = useMemo(() => ramadanWindow(new Date(now)), [today]);
  const fast = useMemo(() => {
    if (!location || !prayerDates || !ramadan.inRamadan) return null;
    const tomorrow = getPrayerDates(location.latitude, location.longitude, addDays(new Date(now), 1), settings.calculationMethod, settings.madhab);
    return fastCountdown(new Date(now), prayerDates, tomorrow.fajr);
  }, [location, prayerDates, ramadan.inRamadan, now, settings.calculationMethod, settings.madhab]);
  const showRamadan = ramadan.inRamadan || ramadan.daysUntil <= 30;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const remainingLabel = (() => {
    if (!nextPrayer) return '';
    const minutes = Math.max(0, Math.round((nextPrayer.time.getTime() - now) / 60000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0
      ? t('home.remaining', { h: String(h), m: String(m) })
      : t('home.remainingMin', { m: String(m) });
  })();

  const order = settings.homeLauncher.order;
  const modules = order.filter((id) => getHomeFeature(id)?.isModule);
  const apps = order.filter((id) => {
    const def = getHomeFeature(id);
    return def && !def.isModule;
  });

  const renderPrayerModule = () => (
    <View key="module_prayer_times">
      {nextPrayer && (
        <Surface variant="hero" padding={space[5]} style={{ marginBottom: space[3] }}>
          <AppText variant="overline" color={colors.onHeroMuted}>
            {t('home.nextPrayer')}
          </AppText>
          <View style={styles.heroRow}>
            <AppText variant="display" color={colors.onHero}>
              {prayer(nextPrayer.name)}
            </AppText>
            <AppText variant="title" color={colors.onHero}>
              {formatClock(nextPrayer.time, lang)}
            </AppText>
          </View>
          <View style={styles.heroFooter}>
            <AppText variant="callout" color={colors.accent} style={{ fontWeight: '600' }}>
              {remainingLabel}
            </AppText>
            {stats.prayerStreakDays > 0 && (
              <View style={[styles.streak, { borderRadius: 999, paddingHorizontal: space[3] }]}>
                <Ionicons name="flame" size={14} color={colors.accent} />
                <AppText variant="caption" color={colors.onHero} style={{ marginLeft: space[1] }}>
                  {t('home.streakDays', { n: String(stats.prayerStreakDays) })}
                </AppText>
              </View>
            )}
          </View>
        </Surface>
      )}

      {prayerDates && (
        <>
          <View style={[styles.strip, { gap: space[2] }]}>
            {DAILY_PRAYERS.map((p) => {
              const done = completedPrayers.has(p);
              const isNext = nextPrayer?.name === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => togglePrayerComplete(p)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${prayer(p)} ${formatClock(prayerDates[p], lang)}`}
                  style={({ pressed }) => [
                    styles.slot,
                    {
                      borderRadius: 14,
                      paddingVertical: space[3],
                      backgroundColor: done ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
                      borderColor: isNext ? colors.primary : done ? colors.primarySoft : colors.border,
                      borderWidth: isNext ? 1.5 : 1,
                    },
                  ]}
                >
                  <AppText variant="caption" tone={done ? 'brand' : 'secondary'} numberOfLines={1}>
                    {prayer(p)}
                  </AppText>
                  <AppText variant="bodyStrong" color={done ? colors.onPrimarySoft : colors.text} style={{ marginTop: 2 }}>
                    {formatClock(prayerDates[p], lang).replace(/ (AM|PM)$/, '')}
                  </AppText>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={done ? colors.primary : colors.textMuted}
                    style={{ marginTop: space[1] }}
                  />
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[2], marginBottom: space[3] }}>
            {t('home.markPrayersHint')}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[8] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { marginBottom: space[5] }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="callout" tone="secondary">
              {t('home.greeting')}
            </AppText>
            {location ? (
              <AppText variant="title" numberOfLines={1}>
                {location.city ?? t('home.yourLocation')}
              </AppText>
            ) : (
              <Pressable onPress={refreshLocation} accessibilityRole="button">
                <AppText variant="title" tone="brand">
                  {t('home.tapLocation')}
                </AppText>
              </Pressable>
            )}
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
            renderPrayerModule()
          ) : (
            <HomeWidgetModule key={id} onOpenDua={(duaId) => navigation.navigate('DuaDetail', { duaId })} />
          )
        )}

        {showRamadan && (
          <Surface
            variant="soft"
            onPress={() => openFeature('imsakiye')}
            accessibilityLabel={t('nav.imsakiye')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4] }}
          >
            <Ionicons name={fast?.kind === 'iftar' ? 'restaurant-outline' : 'moon-outline'} size={26} color={colors.onPrimarySoft} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }}>
                {ramadan.inRamadan ? t('ramadan.dayOf', { n: String(ramadan.dayOfRamadan), total: String(ramadan.length) }) : t('nav.imsakiye')}
              </AppText>
              <AppText variant="bodyStrong" color={colors.onPrimarySoft}>
                {fast
                  ? (() => {
                      const { h, m } = formatDuration(fast.target.getTime() - now);
                      return `${fast.kind === 'iftar' ? t('ramadan.untilIftar') : t('ramadan.untilSahur')}: ${t('ramadan.left', { h: String(h), m: String(m) })}`;
                    })()
                  : ramadan.inRamadan
                    ? t('ramadan.needLocation')
                    : t('ramadan.daysUntil', { n: String(ramadan.daysUntil) })}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
          </Surface>
        )}

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
                label={t(def.titleKey)}
                locked={!canAccess(id)}
                onPress={() => openFeature(id)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  streak: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  strip: { flexDirection: 'row' },
  slot: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
