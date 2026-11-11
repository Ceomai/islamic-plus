import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { formatClock, type NextPrayer } from '../../services/prayerTimes';
import type { PrayerName } from '../../types';
import { AppText, Button, PopIn, Surface } from '../../ui';
import { NextPrayerRemaining } from './NextPrayerRemaining';

export const DAILY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PROGRESS_DOT = 7;
/** Above this text scale the five prayers no longer fit side by side and are listed instead */
const STACK_FONT_SCALE = 1.3;

type PrayerTimesOfDay = Record<PrayerName, Date>;

interface Props {
  hasLocation: boolean;
  nextPrayer: NextPrayer | null;
  /** Today's times, null until a location is known */
  today: PrayerTimesOfDay | null;
  /** Tomorrow's times, shown under today's after Isha */
  tomorrow: PrayerTimesOfDay | null;
  completed: ReadonlySet<PrayerName>;
  countdownTickMs: number;
  onMarkPrayer: (prayer: PrayerName) => void;
  onChooseCity: () => void;
}

/** Home "prayer times" module: next-prayer card, today's prayers to mark as prayed, tomorrow's times */
export function TodayPrayersModule({ hasLocation, nextPrayer, today, tomorrow, completed, countdownTickMs, onMarkPrayer, onChooseCity }: Props) {
  const { colors, radius, space, layout } = useTheme();
  const { t, prayer, lang } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > STACK_FONT_SCALE;

  return (
    <View>
      {!hasLocation && (
        <Surface variant="soft" style={{ marginBottom: space[3], gap: space[3] }}>
          <AppText variant="bodyStrong" color={colors.onPrimarySoft}>
            {t('home.noLocationTitle')}
          </AppText>
          <AppText variant="callout" color={colors.onPrimarySoft}>
            {t('home.noLocationBody')}
          </AppText>
          <Button label={t('city.choose')} icon="list" onPress={onChooseCity} />
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
            <NextPrayerRemaining target={nextPrayer.time} tickMs={countdownTickMs} />
            {/* Today's count instead of a streak: one missed prayer no longer wipes out the progress */}
            <View
              accessible
              accessibilityLabel={t('home.todayCountA11y', { n: String(completed.size) })}
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
                      backgroundColor: completed.has(p) ? colors.accent : colors.heroTrack,
                    }}
                  />
                ))}
              </View>
              <AppText variant="caption" color={colors.onHero}>
                {t('home.todayCount', { n: String(completed.size) })}
              </AppText>
            </View>
          </View>
        </Surface>
      )}

      {today && (
        <>
          <View style={[stacked ? styles.list : prayerStripStyles.strip, { gap: space[2] }]}>
            {DAILY_PRAYERS.map((p) => {
              const done = completed.has(p);
              const isNext = nextPrayer?.name === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onMarkPrayer(p)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  aria-checked={done}
                  accessibilityLabel={`${prayer(p)} ${formatClock(today[p], lang)}`}
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
                    style={stacked ? prayerStripStyles.grow : null}
                  >
                    {prayer(p)}
                  </AppText>
                  <AppText variant="bodyStrong" tone={done ? 'onPrimarySoft' : 'default'} numeric style={stacked ? null : { marginTop: 2 }}>
                    {formatClock(today[p], lang).replace(/ (AM|PM)$/, '')}
                  </AppText>
                  {/* English times drop AM/PM to fit; shown below so "3:39" is not ambiguous */}
                  {lang === 'en' && (
                    <AppText variant="caption" tone={done ? 'onPrimarySoft' : 'muted'}>
                      {formatClock(today[p], lang).slice(-2)}
                    </AppText>
                  )}
                  <PopIn active={done} style={stacked ? null : { marginTop: space[1] }}>
                    <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={done ? colors.onPrimarySoft : colors.textMuted} />
                  </PopIn>
                </Pressable>
              );
            })}
          </View>
          {tomorrow && (
            <View style={{ marginTop: space[2] }}>
              <AppText variant="overline" tone="muted" style={{ marginBottom: space[1] }}>
                {t('home.tomorrow')}
              </AppText>
              <View style={[stacked ? styles.list : prayerStripStyles.strip, { gap: space[2] }]}>
                {DAILY_PRAYERS.map((p) => (
                  <View
                    key={p}
                    accessible
                    accessibilityLabel={`${t('home.tomorrow')} ${prayer(p)} ${formatClock(tomorrow[p], lang)}`}
                    style={stacked ? [styles.listRow, { paddingHorizontal: space[4] }] : styles.slot}
                  >
                    {stacked && (
                      <AppText variant="callout" tone="secondary" style={prayerStripStyles.grow}>
                        {prayer(p)}
                      </AppText>
                    )}
                    <AppText variant={p === 'fajr' ? 'calloutStrong' : 'callout'} tone={p === 'fajr' ? 'brand' : 'secondary'} numeric>
                      {formatClock(tomorrow[p], lang).replace(/ (AM|PM)$/, '')}
                    </AppText>
                    {!stacked && lang === 'en' && (
                      <AppText variant="caption" tone="muted">
                        {formatClock(tomorrow[p], lang).slice(-2)}
                      </AppText>
                    )}
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
}

/** Shared with the home loading placeholder, which mirrors the five-prayer strip */
export const prayerStripStyles = StyleSheet.create({
  strip: { flexDirection: 'row' },
  grow: { flex: 1 },
});

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  streak: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  list: { flexDirection: 'column' },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  slot: { flex: 1, alignItems: 'center' },
});
