import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { statsSummary } from '../services/statistics';
import { AppText, ListRow, Screen, SectionHeader, Surface } from '../ui';
import { lastDayKeys, localDateKey } from '../utils/date';

const CHART_HEIGHT = 120;

type Props = NativeStackScreenProps<RootStackParamList, 'Statistics'>;

export function StatisticsScreen({ navigation }: Props) {
  const { stats, habitScore, refreshStats } = useApp();
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const summary = statsSummary(stats, habitScore);
  const days = lastDayKeys(7);
  const today = localDateKey();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

  const tiles = [
    { label: t('stats.streak'), value: String(stats.prayerStreakDays), hint: t('stats.streakHint') },
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
            <AppText variant="title" color={colors.onPrimarySoft}>
              {tile.value}
            </AppText>
            <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }} numberOfLines={2}>
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 24 }}>
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
                  {key ? new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' }) : ''}
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
