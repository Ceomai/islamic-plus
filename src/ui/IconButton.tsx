import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, type AccessibilityState, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { PopIn } from './PopIn';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  /** Glyph color; defaults to brand text */
  color?: string;
  size?: number;
  disabled?: boolean;
  /** The glyph pops (springs in from a smaller scale) when this turns true, e.g. a bookmark being added */
  popWhen?: boolean;
  /** Starting scale of that pop */
  popFrom?: number;
  style?: ViewStyle;
}

/** Icon-only button with the platform minimum touch area (44pt iOS / 48dp Android). */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  color,
  size = 22,
  disabled,
  popWhen,
  popFrom,
  style,
}: Props) {
  const { colors, layout, motion } = useTheme();
  const glyph = <Ionicons name={name} size={size} color={color ?? colors.primaryText} />;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      style={({ pressed }) => [
        {
          minWidth: layout.minTouch,
          minHeight: layout.minTouch,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? motion.pressedOpacity : 1,
        },
        style,
      ]}
    >
      {popWhen === undefined ? (
        glyph
      ) : (
        <PopIn active={popWhen} from={popFrom}>
          {glyph}
        </PopIn>
      )}
    </Pressable>
  );
}
