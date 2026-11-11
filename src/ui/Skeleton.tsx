import React, { useEffect } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/tokens';
import { easeInOut, timing } from './motion';

/**
 * Loading placeholder group: its blocks breathe together (opacity, native driver) until the content
 * arrives. Static with Reduce Motion. Screen readers hear `accessibilityLabel` ("Loading").
 */
export function SkeletonGroup({
  accessibilityLabel,
  style,
  children,
}: {
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const { minOpacity, pulseHalfPeriod } = motion.skeleton;
  const opacity = useAnimatedValue(1);

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        timing(opacity, minOpacity, pulseHalfPeriod, easeInOut),
        timing(opacity, 1, pulseHalfPeriod, easeInOut),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity, minOpacity, pulseHalfPeriod]);

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[{ opacity }, style]}
    >
      {children}
    </Animated.View>
  );
}

/** One placeholder block inside a SkeletonGroup. */
export function SkeletonBlock({
  width = '100%',
  height,
  radius,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius: radii } = useTheme();
  return <View style={[{ width, height, borderRadius: radius ?? radii.sm, backgroundColor: colors.surfaceMuted }, style]} />;
}
