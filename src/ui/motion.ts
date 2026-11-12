import { Animated, Easing, LayoutAnimation } from 'react-native';
import { isReducedMotionEnabled } from '../hooks/useReducedMotion';
import { motion } from '../theme/tokens';

/**
 * Shared Animated building blocks. Everything runs on the native driver, so only transform and
 * opacity are animated; a new call on the same value starts from where the last one is (never queues).
 */
export const easeOut = Easing.bezier(...motion.easing.out);
export const easeInOut = Easing.bezier(...motion.easing.inOut);

/** Timing animation on the native driver (ease-out unless told otherwise). */
export function timing(value: Animated.Value, toValue: number, duration: number, easing = easeOut) {
  return Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });
}

/** Spring that comes to rest with a slight settle (checkmarks, indicators, release of a press). */
export function settle(value: Animated.Value, toValue: number) {
  return Animated.spring(value, { toValue, ...motion.spring.settle, useNativeDriver: true });
}

/** Quick, non-bouncy spring that follows a finger going down. */
export function pressSpring(value: Animated.Value, toValue: number) {
  return Animated.spring(value, { toValue, ...motion.spring.press, useNativeDriver: true });
}

/**
 * Call right before a state change that adds or removes list rows: new rows fade in, removed rows
 * fade out and the rest slide to close the gap. Skipped with Reduce Motion (the change is instant).
 */
export function animateNextLayout(): void {
  if (isReducedMotionEnabled()) return;
  LayoutAnimation.configureNext({
    duration: motion.duration.base,
    create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.spring, springDamping: motion.listSpringDamping },
    delete: {
      type: LayoutAnimation.Types.easeIn,
      property: LayoutAnimation.Properties.opacity,
      duration: motion.duration.fast,
    },
  });
}
