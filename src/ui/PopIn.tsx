import React, { useLayoutEffect, useRef } from 'react';
import { Animated, useAnimatedValue, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion } from '../theme/tokens';
import { settle } from './motion';

interface Props {
  /** The icon pops when this turns true (not on first render, not when it turns false) */
  active: boolean;
  /** Starting scale of the pop (default motion.popFrom) */
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Wraps an icon (a checkmark, a bookmark) that grows into place with a spring when it turns on. */
export function PopIn({ active, from = motion.popFrom, style, children }: Props) {
  const reduced = useReducedMotion();
  const scale = useAnimatedValue(1);
  const wasActive = useRef(active);

  // Layout effect: the new icon is already scaled down in the first frame it appears
  useLayoutEffect(() => {
    if (active && !wasActive.current && !reduced) {
      scale.setValue(from);
      settle(scale, 1).start();
    } else if (!active) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    wasActive.current = active;
  }, [active, reduced, from, scale]);

  return <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>;
}
