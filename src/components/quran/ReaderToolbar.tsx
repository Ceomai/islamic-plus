import type { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { QuranView } from '../../types';
import { AppText, Chip } from '../../ui';

const VIEWS: { id: QuranView; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'parallel', icon: 'albums-outline' },
  { id: 'translation', icon: 'reader-outline' },
  { id: 'arabic', icon: 'text-outline' },
  { id: 'study', icon: 'school-outline' },
  { id: 'mushaf', icon: 'book-outline' },
];
const FONT_STEP = 0.15;
export const MIN_READER_SCALE = 0.85;
export const MAX_READER_SCALE = 1.6;

interface Props {
  view: QuranView;
  scale: number;
  onViewChange: (view: QuranView) => void;
  onScaleChange: (scale: number) => void;
}

/** Reader toolbar: layout and text size, remembered per account */
export function ReaderToolbar({ view, scale, onViewChange, onScaleChange }: Props) {
  const { colors, space, layout } = useTheme();
  const { t } = useTranslation();
  const atMinScale = scale <= MIN_READER_SCALE;
  const atMaxScale = scale >= MAX_READER_SCALE;
  const scaleText = `${Math.round(scale * 100)}%`;
  const fontButtonStyle = { minWidth: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' } as const;

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2], alignItems: 'center' }}
      >
        {VIEWS.map((v) => (
          <Chip key={v.id} label={t(`quran.view.${v.id}`)} icon={v.icon} selected={view === v.id} onPress={() => onViewChange(v.id)} />
        ))}
        <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: space[1] }} />
        <Pressable
          onPress={() => onScaleChange(scale - FONT_STEP)}
          disabled={atMinScale}
          accessibilityRole="button"
          accessibilityLabel={t('quran.smaller')}
          accessibilityState={{ disabled: atMinScale }}
          accessibilityValue={{ text: scaleText }}
          style={[fontButtonStyle, { opacity: atMinScale ? 0.4 : 1 }]}
        >
          <AppText variant="calloutStrong">A−</AppText>
        </Pressable>
        <Pressable
          onPress={() => onScaleChange(scale + FONT_STEP)}
          disabled={atMaxScale}
          accessibilityRole="button"
          accessibilityLabel={t('quran.larger')}
          accessibilityState={{ disabled: atMaxScale }}
          accessibilityValue={{ text: scaleText }}
          style={[fontButtonStyle, { opacity: atMaxScale ? 0.4 : 1 }]}
        >
          <AppText variant="heading">A+</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
