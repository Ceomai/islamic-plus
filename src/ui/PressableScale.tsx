import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { usePressFeedback } from '../hooks/usePressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children?: React.ReactNode;
  /** Like Pressable's style: an object, or a function of the pressed state (for a pressed tone) */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Scale while pressed (default motion.pressedScale) */
  scaleTo?: number;
};

/** Pressable that shrinks slightly while pressed (dims instead with Reduce Motion). */
export function PressableScale({ style, scaleTo, onPressIn, onPressOut, children, ...rest }: Props) {
  // Pressable keeps its pressed state internally; mirrored here for the style function
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  const baseOpacity = StyleSheet.flatten(resolved)?.opacity;
  const feedback = usePressFeedback({ scaleTo, baseOpacity: typeof baseOpacity === 'number' ? baseOpacity : 1 });

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        feedback.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        feedback.onPressOut();
        onPressOut?.(e);
      }}
      style={[resolved, feedback.style]}
    >
      {children}
    </AnimatedPressable>
  );
}
