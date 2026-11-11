import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useFastCountdown, type PrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { formatClock } from '../../services/prayerTimes';
import { AppText, Surface } from '../../ui';

/** Ticks on the minute, so the minutes change when the clock does */
const TICK_MS = 60_000;

/** Imsakiye card during Ramadan: time left until suhoor ends or until iftar. */
export function FastCountdownCard({ days }: { days: PrayerDays }) {
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const countdown = useFastCountdown(days, true, TICK_MS, true);
  if (!countdown) return null;
  const { h, m } = countdown.remaining;

  return (
    <Surface variant="soft" style={{ marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <Ionicons name={countdown.kind === 'iftar' ? 'restaurant-outline' : 'moon-outline'} size={28} color={colors.onPrimarySoft} />
      <View style={{ flex: 1 }}>
        <AppText variant="captionStrong" tone="onPrimarySoft">
          {countdown.kind === 'iftar' ? t('ramadan.untilIftar') : t('ramadan.untilSahur')} · {formatClock(countdown.target, lang)}
        </AppText>
        <AppText variant="display" tone="onPrimarySoft" numeric>
          {t('ramadan.left', { h: String(h), m: String(m) })}
        </AppText>
      </View>
    </Surface>
  );
}
