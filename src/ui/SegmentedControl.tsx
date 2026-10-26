import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Two-to-four option switcher (sign in / create account, collections, filters). */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 3 }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: space[2],
              borderRadius: radius.md - 3,
              backgroundColor: selected ? colors.surface : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText variant="callout" tone={selected ? 'default' : 'secondary'} style={{ fontWeight: '600' }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
