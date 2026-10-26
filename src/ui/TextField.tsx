import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
}

export function TextField({ label, hint, error, style, onFocus, onBlur, ...rest }: Props) {
  const { colors, radius, space, type } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={{ marginBottom: space[3] }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[1] }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          type.body,
          {
            minHeight: 48,
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            borderRadius: radius.md,
            borderWidth: focused || error ? 1.5 : 1,
            borderColor,
            backgroundColor: colors.surface,
            color: colors.text,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" style={{ marginTop: space[1] }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: space[1] }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
