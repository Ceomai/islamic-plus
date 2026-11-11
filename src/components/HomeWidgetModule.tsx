import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useDayKey } from '../hooks/useClock';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { duaOfTheDay } from '../services/dailyDua';
import { dateFromKey } from '../utils/date';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

interface Props {
  onOpenDua?: (duaId: string) => void;
}

/**
 * "Dua of the day" card on the home screen. It used to be a "home widget" module that repeated the
 * next prayer and the hijri date already shown above it.
 */
export function HomeWidgetModule({ onOpenDua }: Props) {
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  // Rolls over to the next dua after midnight while the app stays open
  const day = useDayKey();
  const dua = useMemo(() => duaOfTheDay(dateFromKey(day)), [day]);
  if (!dua) return null;

  return (
    <Surface
      variant="soft"
      onPress={onOpenDua ? () => onOpenDua(dua.id) : undefined}
      accessibilityLabel={`${t('launcher.widgetModule')}: ${dua.title[lang]}`}
      style={{ marginBottom: space[3], gap: space[2] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Ionicons name="hand-left-outline" size={16} color={colors.onPrimarySoft} />
        <AppText variant="overline" tone="onPrimarySoft" style={{ flex: 1 }}>
          {t('launcher.widgetModule')}
        </AppText>
        {onOpenDua ? <Ionicons name="chevron-forward" size={16} color={colors.onPrimarySoft} /> : null}
      </View>
      <AppText variant="bodyStrong" color={colors.onPrimarySoft}>
        {dua.title[lang]}
      </AppText>
      <AppText variant="arabicDua" numberOfLines={3}>
        {dua.arabic}
      </AppText>
      <AppText variant="callout" tone="secondary" numberOfLines={3}>
        {dua.translation[lang]}
      </AppText>
    </Surface>
  );
}
