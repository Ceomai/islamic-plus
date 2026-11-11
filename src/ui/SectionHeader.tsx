import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const { space, layout } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: space[6],
        marginBottom: space[3],
      }}
    >
      <AppText variant="heading">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={space[2]}
          accessibilityRole="button"
          style={{ minHeight: layout.minTouch, justifyContent: 'center' }}
        >
          <AppText variant="calloutStrong" tone="brand">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
