import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { getDhikr } from '../data/dhikr';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { loadTasbihData, summarizeTasbih } from '../services/tasbihStorage';
import type { TasbihData } from '../types';
import { AppText, ListRow, Screen, SectionHeader, SegmentedControl, Surface } from '../ui';
import { localDateKey } from '../utils/date';

type Period = '1' | '7' | '30';
const RANGE_HOURS = 3;
const CHART_HEIGHT = 110;

export function TasbihStatsScreen() {
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const [data, setData] = useState<TasbihData | null>(null);
  const [period, setPeriod] = useState<Period>('7');

  useEffect(() => {
    void loadTasbihData().then(setData);
  }, []);

  const summary = useMemo(() => (data ? summarizeTasbih(data, Number(period)) : null), [data, period]);

  if (!data || !summary) return <Screen>{null}</Screen>;

  // Hours grouped into 3-hour ranges: 00–03, 03–06, …
  const ranges = Array.from({ length: 24 / RANGE_HOURS }, (_, i) => {
    const from = i * RANGE_HOURS;
    const count = summary.byHour.slice(from, from + RANGE_HOURS).reduce((a, b) => a + b, 0);
    return { label: `${String(from).padStart(2, '0')}–${String(from + RANGE_HOURS).padStart(2, '0')}`, count };
  });
  const periodTotal = ranges.reduce((a, r) => a + r.count, 0);
  const maxRange = Math.max(1, ...ranges.map((r) => r.count));
  const peak = periodTotal > 0 ? ranges.reduce((best, r) => (r.count > best.count ? r : best)) : null;
  const maxDay = Math.max(1, ...summary.byDay.map((d) => d.count));
  const today = localDateKey();
  const num = (n: number) => n.toLocaleString(locale);

  const tiles = [
    { label: t('tasbih.today'), value: summary.today },
    { label: t('tasbih.thisWeek'), value: summary.week },
    { label: t('tasbih.lifetime'), value: summary.total },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {tiles.map((tile) => (
          <Surface key={tile.label} variant="soft" padding={space[3]} style={{ flex: 1 }}>
            <AppText variant="title" color={colors.onPrimarySoft}>
              {num(tile.value)}
            </AppText>
            <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }}>
              {tile.label}
            </AppText>
          </Surface>
        ))}
      </View>

      <SectionHeader title={t('tasbih.byTime')} />
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={[
          { value: '1', label: t('tasbih.today') },
          { value: '7', label: t('tasbih.days7') },
          { value: '30', label: t('tasbih.days30') },
        ]}
      />
      <Surface style={{ marginTop: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 22 }}>
          {ranges.map((r) => (
            <View key={r.label} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: 20,
                  height: Math.max(3, (r.count / maxRange) * CHART_HEIGHT),
                  borderRadius: radius.sm,
                  backgroundColor: peak && r.label === peak.label ? colors.primary : colors.primarySoft,
                }}
              />
              <AppText variant="caption" tone="muted" style={{ marginTop: 4, fontSize: 10 }}>
                {r.label.slice(0, 2)}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginTop: space[2] }}>
          {peak ? t('tasbih.peak', { range: peak.label }) : t('tasbih.noData')}
        </AppText>
      </Surface>

      {/* Same data as a table: range, count and share of the period */}
      <Surface padding={0} style={{ paddingHorizontal: space[4], marginTop: space[3] }}>
        <View style={{ flexDirection: 'row', paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <AppText variant="caption" tone="muted" style={{ flex: 1, fontWeight: '600' }}>
            {t('tasbih.timeRange')}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ width: 70, textAlign: 'right', fontWeight: '600' }}>
            {t('tasbih.count')}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ width: 56, textAlign: 'right', fontWeight: '600' }}>
            %
          </AppText>
        </View>
        {ranges.map((r, i) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              paddingVertical: space[2],
              borderBottomWidth: i < ranges.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <AppText variant="callout" style={{ flex: 1 }}>
              {r.label}
            </AppText>
            <AppText variant="callout" style={{ width: 70, textAlign: 'right', fontWeight: '600' }}>
              {num(r.count)}
            </AppText>
            <AppText variant="callout" tone="secondary" style={{ width: 56, textAlign: 'right' }}>
              {periodTotal ? Math.round((r.count / periodTotal) * 100) : 0}
            </AppText>
          </View>
        ))}
      </Surface>

      <SectionHeader title={t('tasbih.last7')} />
      <Surface>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 40 }}>
          {summary.byDay.map((d) => (
            <View key={d.key} style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" tone="secondary" style={{ fontSize: 10 }}>
                {d.count ? num(d.count) : ''}
              </AppText>
              <View
                style={{
                  width: 18,
                  height: Math.max(3, (d.count / maxDay) * CHART_HEIGHT),
                  borderRadius: radius.sm,
                  backgroundColor: d.key === today ? colors.primary : colors.primarySoft,
                  marginTop: 2,
                }}
              />
              <AppText variant="caption" tone={d.key === today ? 'brand' : 'muted'} style={{ marginTop: 4 }}>
                {new Date(`${d.key}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}
              </AppText>
            </View>
          ))}
        </View>
      </Surface>

      <SectionHeader title={t('tasbih.recentRounds')} />
      {data.sessions.length === 0 ? (
        <Surface variant="muted">
          <AppText variant="callout" tone="secondary" align="center">
            {t('tasbih.noRounds')}
          </AppText>
        </Surface>
      ) : (
        <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
          {data.sessions.slice(0, 15).map((s, i, list) => {
            const name = getDhikr(s.dhikrId)?.transliteration ?? t('tasbih.dhikr');
            const done = s.count >= s.target;
            return (
              <ListRow
                key={s.id}
                icon={done ? 'checkmark-circle-outline' : 'ellipse-outline'}
                iconTone={done ? 'brand' : 'neutral'}
                title={name}
                subtitle={new Date(s.completedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                value={`${s.count}/${s.target}`}
                divider={i < list.length - 1}
              />
            );
          })}
        </Surface>
      )}
      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {t('tasbih.statsNote')}
      </AppText>
    </Screen>
  );
}
