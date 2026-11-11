import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { SkeletonBlock, SkeletonGroup } from '../../ui';

/** Loading placeholder: a few ayahs, each an Arabic line and two translation lines */
const SKELETON_AYAHS = 4;
const SKELETON_LINE_WIDTHS = ['100%', '92%', '64%'] as const;

export function ReaderSkeleton() {
  const { radius, space, type, layout } = useTheme();
  const { t } = useTranslation();
  return (
    <SkeletonGroup
      accessibilityLabel={t('common.loading')}
      style={{ padding: space[4], gap: space[6], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
    >
      {Array.from({ length: SKELETON_AYAHS }, (_, i) => (
        <View key={i} style={{ gap: space[2] }}>
          <SkeletonBlock width={space[8]} height={space[6]} radius={radius.pill} />
          <SkeletonBlock height={type.arabicQuran.fontSize ?? space[6]} style={{ marginVertical: space[2] }} />
          {SKELETON_LINE_WIDTHS.map((w) => (
            <SkeletonBlock key={w} width={w} height={space[3]} />
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}
