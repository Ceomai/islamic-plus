import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

/** Selectable pill for filters and options. */
export function Chip({ label, selected, icon, onPress }: Props) {
  const { colors, radius, space } = useTheme();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        borderRadius: radius.pill,
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        backgroundColor: selected ? colors.primary : pressed ? colors.surfaceMuted : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
        <AppText variant="callout" color={fg} style={{ fontWeight: '600' }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
