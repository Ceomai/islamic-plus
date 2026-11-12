import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme, type ThemeColors } from '../hooks/useTheme';
import type { TypeVariant } from '../theme/tokens';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'onPrimary'
  | 'onPrimarySoft'
  | 'onHero'
  | 'onHeroMuted'
  | 'onHeroAccent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'accent'
  | 'accentText';

type StringColorKey = { [K in keyof ThemeColors]: ThemeColors[K] extends string ? K : never }[keyof ThemeColors];

const toneKey: Record<TextTone, StringColorKey> = {
  default: 'text',
  secondary: 'textSecondary',
  muted: 'textMuted',
  // primary is a fill color; brand text uses the contrast-tuned primaryText
  brand: 'primaryText',
  onPrimary: 'onPrimary',
  onPrimarySoft: 'onPrimarySoft',
  onHero: 'onHero',
  onHeroMuted: 'onHeroMuted',
  onHeroAccent: 'onHeroAccent',
  danger: 'error',
  success: 'success',
  warning: 'warning',
  /** Text on accentSoft */
  accent: 'onAccentSoft',
  /** Gold text on background/surface */
  accentText: 'accentText',
};

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Overrides tone — for text on custom backgrounds */
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Tabular figures for times, countdowns and counters */
  numeric?: boolean;
}

export function AppText({ variant = 'body', tone = 'default', color, align, numeric, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.type[variant],
        { color: color ?? theme.colors[toneKey[tone]] },
        numeric ? theme.numeric : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
