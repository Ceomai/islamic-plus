import React from 'react';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Surface } from '../ui/Surface';

/** Legacy card wrapper — same API as before, now drawn by the design-system Surface. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { space } = useTheme();
  return <Surface style={[{ marginBottom: space[3] }, style ?? {}]}>{children}</Surface>;
}
