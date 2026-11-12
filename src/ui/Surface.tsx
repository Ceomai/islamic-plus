import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { PressableScale } from './PressableScale';

export type SurfaceVariant = 'default' | 'muted' | 'hero' | 'soft';

interface Props {
  children: React.ReactNode;
  variant?: SurfaceVariant;
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}

/** Card container. `hero` is the brand block (white text), `soft` a brand-tinted panel. */
export function Surface({ children, variant = 'default', padding, onPress, style, accessibilityLabel }: Props) {
  const { colors, radius, space } = useTheme();

  const look: ViewStyle = {
    default: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
    muted: { backgroundColor: colors.surfaceMuted, borderColor: 'transparent', borderWidth: 0 },
    hero: { backgroundColor: colors.hero, borderColor: 'transparent', borderWidth: 0 },
    soft: { backgroundColor: colors.primarySoft, borderColor: 'transparent', borderWidth: 0 },
  }[variant];

  const base: ViewStyle = { borderRadius: radius.lg, padding: padding ?? space[4], ...look };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
