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
  const { colors, radius, space, type, component } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.inputBorder;

  return (
    <View style={{ marginBottom: space[3] }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[1] }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        // Without this the label was only visual: screen readers announced an unnamed field
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
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
            minHeight: component.textField.minHeight,
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            borderRadius: radius.md,
            borderWidth: focused || error ? component.textField.borderWidthFocused : component.textField.borderWidth,
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
