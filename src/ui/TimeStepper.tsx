import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { stepTime } from '../utils/time';
import { AppText } from './AppText';

interface Props {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  labels: { hourUp: string; hourDown: string; minuteUp: string; minuteDown: string };
}

/**
 * Hour and minute steppers in place of typing "08:30" on the keyboard. Plain JS, so it works the
 * same on Android, iOS and web without a native picker module.
 */
export function TimeStepper({ label, hint, value, onChange, labels }: Props) {
  const { colors, radius, space } = useTheme();
  const [hh, mm] = value.split(':');

  const arrow = (icon: 'chevron-up' | 'chevron-down', a11y: string, next: () => string) => (
    <Pressable
      onPress={() => onChange(next())}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 56,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.primarySoft : colors.surfaceMuted,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );

  const column = (unit: 'hour' | 'minute', text: string | undefined, up: string, down: string) => (
    <View style={{ alignItems: 'center', gap: space[1] }}>
      {arrow('chevron-up', up, () => stepTime(value, unit, 1))}
      <AppText variant="display" style={{ minWidth: 56, textAlign: 'center' }}>
        {text ?? '--'}
      </AppText>
      {arrow('chevron-down', down, () => stepTime(value, unit, -1))}
    </View>
  );

  return (
    <View style={{ marginBottom: space[3] }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[1] }}>
          {label}
        </AppText>
      ) : null}
      <View
        accessible={false}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[3], paddingVertical: space[2] }}
      >
        {column('hour', hh, labels.hourUp, labels.hourDown)}
        <AppText variant="display">:</AppText>
        {column('minute', mm, labels.minuteUp, labels.minuteDown)}
      </View>
      {hint ? (
        <AppText variant="caption" tone="muted" align="center">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
