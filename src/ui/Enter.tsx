import React, { useEffect } from 'react';
import { Animated, useAnimatedValue, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { timing } from './motion';

interface Props {
  /** false renders the content in place without animating (content that was already on screen) */
  animate?: boolean;
  duration: number;
  /** Travel at the start, in points; dropped with Reduce Motion (fade only) */
  offsetX?: number;
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Fades (and optionally slides) its content in once, when it mounts. */
export function Enter({ animate = true, duration, offsetX = 0, offsetY = 0, style, children }: Props) {
  const reduced = useReducedMotion();
  const travel = animate && !reduced;
  const opacity = useAnimatedValue(animate ? 0 : 1);
  const x = useAnimatedValue(travel ? offsetX : 0);
  const y = useAnimatedValue(travel ? offsetY : 0);

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([timing(opacity, 1, duration), timing(x, 0, duration), timing(y, 0, duration)]).start();
    // Mount-only: the entrance plays once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateX: x }, { translateY: y }] }, style]}>{children}</Animated.View>
  );
}
