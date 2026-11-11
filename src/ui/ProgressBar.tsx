import React, { useEffect, useRef } from 'react';
import { Animated, I18nManager, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { motion } from '../theme/tokens';
import { timing } from './motion';

interface Props {
  /** 0–1 */
  progress: number;
  height?: number;
  fillColor: string;
  trackColor: string;
  /** How long the fill takes to grow (default motion.duration.fast) */
  duration?: number;
  /** A drop back to empty fades the full bar out instead of shrinking it backwards */
  fadeOnReset?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Horizontal progress bar. The fill is a full-width layer scaled on X from the leading edge, so it
 * animates on the native driver without a layout pass. Reduce Motion: the fill jumps.
 */
export function ProgressBar({
  progress,
  height = 6,
  fillColor,
  trackColor,
  duration = motion.duration.fast,
  fadeOnReset,
  accessibilityLabel,
  style,
}: Props) {
  const { radius } = useTheme();
  const reduced = useReducedMotion();
  const target = clamp01(progress);
  const scaleX = useAnimatedValue(target);
  const opacity = useAnimatedValue(1);
  const shown = useRef(target);
  const fading = useRef(false);

  useEffect(() => {
    const previous = shown.current;
    shown.current = target;
    if (target === previous) return;

    if (fadeOnReset && target === 0 && previous > 0 && !reduced) {
      fading.current = true;
      scaleX.stopAnimation();
      timing(opacity, 0, motion.duration.medium).start(({ finished }) => {
        if (!finished) return;
        fading.current = false;
        scaleX.setValue(0);
        opacity.setValue(1);
      });
      return;
    }

    // A tap during the reset fade starts the new round from empty
    if (fading.current) {
      fading.current = false;
      opacity.stopAnimation();
      scaleX.setValue(0);
      opacity.setValue(1);
    }
    if (reduced) {
      scaleX.stopAnimation();
      scaleX.setValue(target);
    } else {
      timing(scaleX, target, duration).start();
    }
  }, [target, reduced, fadeOnReset, duration, scaleX, opacity]);

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityLabel ? { min: 0, max: 100, now: Math.round(target * 100) } : undefined}
      style={[{ height, borderRadius: radius.pill, backgroundColor: trackColor, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: fillColor,
          transformOrigin: I18nManager.isRTL ? 'right' : 'left',
          opacity,
          transform: [{ scaleX }],
        }}
      />
    </View>
  );
}
