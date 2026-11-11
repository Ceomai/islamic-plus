import { useCallback, useMemo } from 'react';
import { useAnimatedValue } from 'react-native';
import { motion } from '../theme/tokens';
import { pressSpring, settle, timing } from '../ui/motion';
import { useReducedMotion } from './useReducedMotion';

interface Options {
  /** Scale while pressed (default motion.pressedScale) */
  scaleTo?: number;
  /** Resting opacity of the element (a disabled or locked look), kept under the reduced-motion fade */
  baseOpacity?: number;
}

/**
 * Press feedback on the native driver: the element shrinks a little on press-in and settles back on
 * release. A new press starts from wherever the last animation is. With Reduce Motion it dims instead.
 */
export function usePressFeedback({ scaleTo = motion.pressedScale, baseOpacity = 1 }: Options = {}) {
  const reduced = useReducedMotion();
  // 0 = resting, 1 = pressed
  const progress = useAnimatedValue(0);

  const onPressIn = useCallback(() => {
    (reduced ? timing(progress, 1, motion.duration.fast) : pressSpring(progress, 1)).start();
  }, [reduced, progress]);

  const onPressOut = useCallback(() => {
    (reduced ? timing(progress, 0, motion.duration.fast) : settle(progress, 0)).start();
  }, [reduced, progress]);

  const style = useMemo(
    () =>
      reduced
        ? {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [baseOpacity, baseOpacity * motion.pressedOpacity],
              extrapolate: 'clamp',
            }),
          }
        : { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }] },
    [reduced, progress, scaleTo, baseOpacity]
  );

  return { onPressIn, onPressOut, style };
}
