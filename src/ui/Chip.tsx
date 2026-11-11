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
  /** Highlighted look without the semantic "selected" state (a suggested action, not a filter) */
  emphasis?: boolean;
}

/** Selectable pill for filters and options. */
export function Chip({ label, selected, icon, onPress, emphasis }: Props) {
  const { colors, radius, space, layout } = useTheme();
  const filled = selected || emphasis;
  const fg = filled ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      // Chips look ~36pt tall; hitSlop extends the touch area to the platform minimum (44pt / 48dp)
      hitSlop={{ top: space[2], bottom: space[2] }}
      style={({ pressed }) => ({
        minHeight: layout.minTouch - space[4],
        justifyContent: 'center',
        borderRadius: radius.pill,
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        backgroundColor: filled ? colors.primary : pressed ? colors.surfaceMuted : colors.surface,
        borderWidth: 1,
        borderColor: filled ? colors.primary : colors.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
        <AppText variant="calloutStrong" color={fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
