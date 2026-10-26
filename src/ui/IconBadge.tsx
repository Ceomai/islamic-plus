import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'accent' | 'neutral' | 'danger';
}

const dims = { sm: { box: 32, icon: 16 }, md: { box: 40, icon: 20 }, lg: { box: 52, icon: 24 } };

/** Rounded square holding an icon on a tinted background. */
export function IconBadge({ name, size = 'md', tone = 'brand' }: Props) {
  const { colors, radius } = useTheme();
  const { box, icon } = dims[size];
  const palette = {
    brand: { bg: colors.primarySoft, fg: colors.onPrimarySoft },
    accent: { bg: colors.accentSoft, fg: colors.onAccentSoft },
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    danger: { bg: colors.errorSoft, fg: colors.error },
  }[tone];

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: size === 'lg' ? radius.lg : radius.md,
        backgroundColor: palette.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={icon} color={palette.fg} />
    </View>
  );
}
