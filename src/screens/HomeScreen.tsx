import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeAppIcon } from '../components/HomeAppIcon';
import { HomeWidgetModule } from '../components/HomeWidgetModule';
import { getHomeFeature } from '../constants/homeFeatures';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useOptimisticSet } from '../hooks/useOptimisticSet';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { gregorianToHijri } from '../services/hijriCalendar';
import { fastCountdown, formatDuration, ramadanWindow } from '../services/ramadan';
import { launcherColumns } from '../theme/tokens';
import { confirm } from '../utils/confirm';
import { addDays } from '../utils/date';
import { formatClock, getNextPrayer, getPrayerDates } from '../services/prayerTimes';
import type { HomeFeatureId, PrayerName } from '../types';
import { AppText, Button, Enter, ListRow, PopIn, SectionHeader, SkeletonBlock, SkeletonGroup, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DAILY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const COUNTDOWN_TICK_MS = 30_000;
const PROGRESS_DOT = 7;
const ICON_BUTTON = 44;
/** Above this text scale the five prayers no longer fit side by side and are listed instead */
const STACK_FONT_SCALE = 1.3;
/** Loading placeholder heights: the next-prayer card and one prayer slot */
const SKELETON_HERO = 132;
const SKELETON_SLOT = 76;

export function HomeScreen({ navigation }: Props) {
  const {
    location,
    refreshLocation,
    loading,
    settings,
    quranProgress,
    hadithProgress,
    todayPrayers,
    togglePrayerComplete,
    refreshTodayPrayers,
  } = useApp();
  const { canAccess } = useFeatureAccess();
  const { logout } = useAuth();
  const { colors, radius, space, layout, motion } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale > STACK_FONT_SCALE;
  const columns = launcherColumns(width);
  const { t, prayer, lang } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // A city chosen by hand stays until the user picks "use my location" again
    if (!location?.cityId) void refreshLocation();
    void refreshTodayPrayers();
  }, []);

  // Keep the countdown (and the day's schedule after midnight) current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
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
  const tomorrowDates = useMemo(() => {
    if (!location || !prayerDates || now < prayerDates.isha.getTime()) return null;
    return getPrayerDates(location.latitude, location.longitude, addDays(new Date(now), 1), settings.calculationMethod, settings.madhab);
  }, [location, prayerDates, now, settings.calculationMethod, settings.madhab]);

  // Ramadan card: suhoor/iftar countdown during Ramadan, days left in the month before it
  const ramadan = useMemo(() => ramadanWindow(new Date(now)), [today]);
  const fast = useMemo(() => {
    if (!location || !prayerDates || !ramadan.inRamadan) return null;
    const tomorrow = getPrayerDates(location.latitude, location.longitude, addDays(new Date(now), 1), settings.calculationMethod, settings.madhab);
    return fastCountdown(new Date(now), prayerDates, tomorrow.fajr);
  }, [location, prayerDates, ramadan.inRamadan, now, settings.calculationMethod, settings.madhab]);
  const showRamadan = ramadan.inRamadan || ramadan.daysUntil <= 30;

  if (loading) return <HomeSkeleton label={t('common.loading')} />;

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
      {!location && (
        <Surface variant="soft" style={{ marginBottom: space[3], gap: space[3] }}>
          <AppText variant="bodyStrong" color={colors.onPrimarySoft}>
            {t('home.noLocationTitle')}
          </AppText>
          <AppText variant="callout" color={colors.onPrimarySoft}>
            {t('home.noLocationBody')}
          </AppText>
          <Button label={t('city.choose')} icon="list" onPress={() => navigation.navigate('CityPicker')} />
        </Surface>
      )}
      {nextPrayer && (
        <Surface variant="hero" padding={space[5]} style={{ marginBottom: space[3] }}>
          <AppText variant="overline" color={colors.onHeroMuted}>
            {t('home.nextPrayer')}
          </AppText>
          <View style={styles.heroRow}>
            <AppText variant="display" color={colors.onHero}>
              {prayer(nextPrayer.name)}
            </AppText>
            <AppText variant="title" tone="onHero" numeric>
              {formatClock(nextPrayer.time, lang)}
            </AppText>
          </View>
          <View style={styles.heroFooter}>
            <AppText variant="calloutStrong" tone="onHeroAccent" numeric>
              {remainingLabel}
            </AppText>
            {/* Today's count instead of a streak: one missed prayer no longer wipes out the progress */}
            <View
              accessible
              accessibilityLabel={t('home.todayCountA11y', { n: String(completedPrayers.size) })}
              style={[styles.streak, { borderRadius: radius.pill, backgroundColor: colors.heroChipBg, paddingHorizontal: space[3], gap: space[2] }]}
            >
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {DAILY_PRAYERS.map((p) => (
                  <View
                    key={p}
                    style={{
                      width: PROGRESS_DOT,
                      height: PROGRESS_DOT,
                      borderRadius: PROGRESS_DOT / 2,
                      backgroundColor: completedPrayers.has(p) ? colors.accent : colors.heroTrack,
                    }}
                  />
                ))}
              </View>
              <AppText variant="caption" color={colors.onHero}>
                {t('home.todayCount', { n: String(completedPrayers.size) })}
              </AppText>
            </View>
          </View>
        </Surface>
      )}

      {prayerDates && (
        <>
          <View style={[stacked ? styles.list : styles.strip, { gap: space[2] }]}>
            {DAILY_PRAYERS.map((p) => {
              const done = completedPrayers.has(p);
              const isNext = nextPrayer?.name === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => markPrayer(p)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  aria-checked={done}
                  accessibilityLabel={`${prayer(p)} ${formatClock(prayerDates[p], lang)}`}
                  style={({ pressed }) => [
                    stacked ? [styles.listRow, { gap: space[3], paddingHorizontal: space[4], minHeight: layout.minTouch }] : styles.slot,
                    {
                      borderRadius: radius.md,
                      paddingVertical: space[3],
                      backgroundColor: done ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
                      borderColor: isNext ? colors.primary : done ? colors.primarySoft : colors.border,
                      borderWidth: isNext ? 1.5 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant={stacked ? 'body' : 'caption'}
                    tone={done ? 'onPrimarySoft' : 'secondary'}
                    numberOfLines={stacked ? undefined : 1}
                    style={stacked ? styles.grow : null}
                  >
                    {prayer(p)}
                  </AppText>
                  <AppText variant="bodyStrong" tone={done ? 'onPrimarySoft' : 'default'} numeric style={stacked ? null : { marginTop: 2 }}>
                    {formatClock(prayerDates[p], lang).replace(/ (AM|PM)$/, '')}
                  </AppText>
                  {/* English times drop AM/PM to fit; shown below so "3:39" is not ambiguous */}
                  {lang === 'en' && (
                    <AppText variant="caption" tone={done ? 'onPrimarySoft' : 'muted'}>
                      {formatClock(prayerDates[p], lang).slice(-2)}
                    </AppText>
                  )}
                  <PopIn active={done} style={stacked ? null : { marginTop: space[1] }}>
                    <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={done ? colors.onPrimarySoft : colors.textMuted} />
                  </PopIn>
                </Pressable>
              );
            })}
          </View>
          {tomorrowDates && (
            <View style={{ marginTop: space[2] }}>
              <AppText variant="overline" tone="muted" style={{ marginBottom: space[1] }}>
                {t('home.tomorrow')}
              </AppText>
              <View style={[stacked ? styles.list : styles.strip, { gap: space[2] }]}>
                {DAILY_PRAYERS.map((p) => (
                  <View
                    key={p}
                    accessible
                    accessibilityLabel={`${t('home.tomorrow')} ${prayer(p)} ${formatClock(tomorrowDates[p], lang)}`}
                    style={stacked ? [styles.listRow, { paddingHorizontal: space[4] }] : styles.slot}
                  >
                    {stacked && (
                      <AppText variant="callout" tone="secondary" style={styles.grow}>
                        {prayer(p)}
                      </AppText>
                    )}
                    <AppText variant={p === 'fajr' ? 'calloutStrong' : 'callout'} tone={p === 'fajr' ? 'brand' : 'secondary'} numeric>
                      {formatClock(tomorrowDates[p], lang).replace(/ (AM|PM)$/, '')}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[2], marginBottom: space[3] }}>
            {t('home.markPrayersHint')}
          </AppText>
        </>
      )}
    </View>
  );

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
                <AppText variant="captionStrong" tone="onPrimarySoft">
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

/** Loading placeholder in the shape of the home screen: header, next-prayer card and the five prayers. */
function HomeSkeleton({ label }: { label: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <SkeletonGroup accessibilityLabel={label} style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
        <SkeletonBlock width="35%" height={space[4]} />
        <SkeletonBlock width="60%" height={space[6]} style={{ marginTop: space[2], marginBottom: space[5] }} />
        <SkeletonBlock height={SKELETON_HERO} radius={radius.lg} style={{ marginBottom: space[3] }} />
        <View style={[styles.strip, { gap: space[2] }]}>
          {DAILY_PRAYERS.map((p) => (
            <SkeletonBlock key={p} width="auto" height={SKELETON_SLOT} radius={radius.md} style={styles.grow} />
          ))}
        </View>
      </SkeletonGroup>
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
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  streak: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  strip: { flexDirection: 'row' },
  list: { flexDirection: 'column' },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  slot: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
