import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DUA_CATEGORIES, DUAS } from '../data/duas';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { AppText, Chip, IconBadge, Screen, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Duas'>;

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof IconBadge>['name']> = {
  morning: 'sunny-outline',
  evening: 'moon-outline',
  prayer: 'hand-left-outline',
  travel: 'airplane-outline',
  food: 'restaurant-outline',
  general: 'heart-outline',
};

export function DuasScreen({ navigation }: Props) {
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | 'all'>('all');

  const filtered = useMemo(() => (category === 'all' ? DUAS : DUAS.filter((d) => d.category === category)), [category]);

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('duas.intro')}
      </AppText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4], marginBottom: space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        <Chip label={t('duas.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {DUA_CATEGORIES.map((c) => (
          <Chip key={c} label={t(`duas.cat.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {filtered.map((dua) => (
        <Surface
          key={dua.id}
          onPress={() => navigation.navigate('DuaDetail', { duaId: dua.id })}
          accessibilityLabel={t(dua.titleKey)}
          style={{ marginBottom: space[3] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconBadge name={CATEGORY_ICONS[dua.category] ?? 'heart-outline'} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t(dua.titleKey)}</AppText>
              <AppText variant="caption" tone="secondary">
                {t(`duas.cat.${dua.category}`)}
                {dua.audioUrl ? ` · ${t('duas.hasAudio')}` : ''}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <AppText tone="brand" numberOfLines={1} style={{ fontSize: 20, lineHeight: 34, textAlign: 'right', marginTop: space[2] }}>
            {dua.arabic}
          </AppText>
        </Surface>
      ))}
    </Screen>
  );
}
