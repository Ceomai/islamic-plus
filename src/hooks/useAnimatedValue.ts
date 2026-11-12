import { useState } from 'react';
import { Animated } from 'react-native';

/**
 * One Animated.Value per component, created on first render. React Native exports this hook,
 * but react-native-web does not, and importing it from there broke every screen on web.
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
