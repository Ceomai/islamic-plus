import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useFastCountdown, type PrayerDays } from '../../hooks/usePrayerDays';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { RamadanWindow } from '../../services/ramadan';
import { AppText, Surface } from '../../ui';

interface Props {
  ramadan: RamadanWindow;
  days: PrayerDays | null;
  tickMs: number;
  onPress: () => void;
}

/** Home card: suhoor/iftar countdown during Ramadan, days left in the month before it. */
export function RamadanCard({ ramadan, days, tickMs, onPress }: Props) {
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const fast = useFastCountdown(days, ramadan.inRamadan, tickMs);

  let line: string;
  if (fast) {
    const { h, m } = fast.remaining;
    line = `${fast.kind === 'iftar' ? t('ramadan.untilIftar') : t('ramadan.untilSahur')}: ${t('ramadan.left', { h: String(h), m: String(m) })}`;
  } else {
    line = ramadan.inRamadan ? t('ramadan.needLocation') : t('ramadan.daysUntil', { n: String(ramadan.daysUntil) });
  }

  return (
    <Surface
      variant="soft"
      onPress={onPress}
      accessibilityLabel={t('nav.imsakiye')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4] }}
    >
      <Ionicons name={fast?.kind === 'iftar' ? 'restaurant-outline' : 'moon-outline'} size={26} color={colors.onPrimarySoft} />
      <View style={{ flex: 1 }}>
        <AppText variant="captionStrong" tone="onPrimarySoft">
          {ramadan.inRamadan ? t('ramadan.dayOf', { n: String(ramadan.dayOfRamadan), total: String(ramadan.length) }) : t('nav.imsakiye')}
        </AppText>
        <AppText variant="bodyStrong" color={colors.onPrimarySoft}>
          {line}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
    </Surface>
  );
}
