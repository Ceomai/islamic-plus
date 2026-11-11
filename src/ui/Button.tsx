import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
}: Props) {
  const { colors, radius, space, layout } = useTheme();

  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primaryText, border: 'transparent' },
    danger: { bg: colors.errorSoft, pressed: colors.errorSoftPressed, fg: colors.error, border: 'transparent' },
  }[variant];

  // Platform minimum: 44pt on iOS, 48dp on Android
  const height = size === 'lg' ? 52 : layout.minTouch;
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      // Keeps the name while the label is replaced by the spinner
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: size === 'lg' ? space[6] : space[4],
          borderRadius: radius.md,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} style={{ marginRight: space[2] }} /> : null}
          <AppText variant="bodyStrong" color={palette.fg}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
