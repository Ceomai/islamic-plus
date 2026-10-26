import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme, type ThemeColors } from '../hooks/useTheme';
import type { TypeVariant } from '../theme/tokens';

export type TextTone = 'default' | 'secondary' | 'muted' | 'brand' | 'onPrimary' | 'danger' | 'success' | 'accent';

const toneKey: Record<TextTone, keyof ThemeColors> = {
  default: 'text',
  secondary: 'textSecondary',
  muted: 'textMuted',
  brand: 'primary',
  onPrimary: 'onPrimary',
  danger: 'error',
  success: 'success',
  accent: 'onAccentSoft',
};

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Overrides tone — for text on custom backgrounds */
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', tone = 'default', color, align, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.type[variant],
        { color: color ?? (theme.colors[toneKey[tone]] as string) },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
