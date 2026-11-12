import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useHabits, usePrayerDay, useStats } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { loadPrayerCompletions } from '../services/prayerTracking';
import { countPrayersInDays, statsSummary } from '../services/statistics';
import { AppText, ListRow, Screen, SectionHeader, Surface } from '../ui';
import { lastDayKeys, localDateKey } from '../utils/date';

const CHART_HEIGHT = 120;

type Props = NativeStackScreenProps<RootStackParamList, 'Statistics'>;

export function StatisticsScreen({ navigation }: Props) {
  const { stats, refreshStats } = useStats();
  const { habitScore } = useHabits();
  const { todayPrayers } = usePrayerDay();
  const { colors, radius, space } = useTheme();
  const { t, locale } = useTranslation();

  const [weekPrayers, setWeekPrayers] = useState(0);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Recounted when today's marks change
  useEffect(() => {
    void loadPrayerCompletions().then((list) => setWeekPrayers(countPrayersInDays(list, 7)));
  }, [todayPrayers]);

  const summary = statsSummary(stats, habitScore);
  const days = lastDayKeys(7);
  const today = localDateKey();

  const weekday = (key: string | undefined) =>
    key ? new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' }) : '';
  // One spoken summary instead of seven unlabeled bars
  const chartLabel = `${t('stats.weeklyChart')}: ${stats.weeklyActivity
    .map((v, i) => `${weekday(days[i])} ${Math.round(v)}%`)
    .join(', ')}`;

  const tiles = [
    { label: t('stats.streak'), value: `${weekPrayers}/35`, hint: t('stats.streakHint') },
    { label: t('stats.habits'), value: `${summary.habitScore}%`, hint: t('stats.habitsHint') },
    { label: t('stats.weekly'), value: String(summary.weeklyAvg), hint: t('stats.weeklyHint') },
  ];

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('stats.intro')}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {tiles.map((tile) => (
          <Surface key={tile.label} variant="soft" padding={space[3]} style={{ flex: 1 }}>
            <AppText variant="title" tone="onPrimarySoft" numeric>
              {tile.value}
            </AppText>
            <AppText variant="captionStrong" tone="onPrimarySoft" numberOfLines={2}>
              {tile.label}
            </AppText>
          </Surface>
        ))}
      </View>
      <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
        {t('stats.streakHint')}
      </AppText>

      <SectionHeader title={t('stats.weeklyChart')} />
      <Surface>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={chartLabel}
          style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 24 }}
        >
          {stats.weeklyActivity.map((v, i) => {
            const key = days[i];
            const isToday = key === today;
            return (
              <View key={key ?? i} style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    width: 18,
                    height: Math.max(4, (v / 100) * CHART_HEIGHT),
                    borderRadius: radius.sm,
                    backgroundColor: isToday ? colors.primary : colors.primarySoft,
                  }}
                />
                <AppText variant="caption" tone={isToday ? 'brand' : 'muted'} style={{ marginTop: space[1] }}>
                  {weekday(key)}
                </AppText>
              </View>
            );
          })}
        </View>
      </Surface>

      <SectionHeader title={t('stats.totals')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        <ListRow
          icon="ellipse-outline"
          title={t('stats.tasbih')}
          value={stats.tasbihTotal.toLocaleString(locale)}
          onPress={() => navigation.navigate('TasbihStats')}
          divider
        />
        <ListRow icon="hand-left-outline" title={t('stats.duasRead')} value={String(stats.duasReadCount)} divider />
        <ListRow icon="checkmark-done-outline" title={t('stats.habitsDone')} value={String(stats.habitsCompletedTotal)} divider />
        <ListRow icon="book-outline" title={t('stats.quranSessions')} value={String(stats.quranSessions)} />
      </Surface>
    </Screen>
  );
}
