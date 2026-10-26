import React from 'react';
import { Switch } from 'react-native';
import { HomeWidgetModule } from '../components/HomeWidgetModule';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { WidgetPreferences } from '../types';
import { AppText, ListRow, Screen, SectionHeader, Surface } from '../ui';

const ROWS: { key: keyof WidgetPreferences; icon: React.ComponentProps<typeof ListRow>['icon']; label: string }[] = [
  { key: 'showNextPrayer', icon: 'time-outline', label: 'widgets.nextPrayer' },
  { key: 'showHijriDate', icon: 'calendar-outline', label: 'widgets.hijri' },
  { key: 'showDailyDua', icon: 'hand-left-outline', label: 'widgets.dailyDua' },
  { key: 'compactMode', icon: 'contract-outline', label: 'widgets.compact' },
];

export function WidgetsScreen() {
  const { settings, updateSettings } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const prefs = settings.widgetPrefs;

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('widgets.intro')}
      </AppText>

      <AppText variant="overline" tone="muted" style={{ marginBottom: space[2] }}>
        {t('widgets.preview')}
      </AppText>
      <HomeWidgetModule />

      <SectionHeader title={t('widgets.contents')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {ROWS.map((row, i) => (
          <ListRow
            key={row.key}
            icon={row.icon}
            title={t(row.label)}
            divider={i < ROWS.length - 1}
            trailing={
              <Switch
                value={prefs[row.key]}
                onValueChange={(v) => updateSettings({ widgetPrefs: { ...prefs, [row.key]: v } })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
              />
            }
          />
        ))}
      </Surface>

      <AppText variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        {t('widgets.nativeNote')}
      </AppText>
    </Screen>
  );
}
