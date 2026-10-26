import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { IconBadge } from '../ui/IconBadge';

/** Launcher tile: white card with a tinted icon; a lock badge marks guest-restricted features. */
export function HomeAppIcon(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Kept for API compatibility — tiles now follow the theme instead of per-feature colors */
  color?: string;
  locked?: boolean;
  onPress: () => void;
}) {
  const { colors, radius, space } = useTheme();
  return (
    <View style={styles.cell}>
      <Pressable
        onPress={props.onPress}
        accessibilityRole="button"
        accessibilityLabel={props.label}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingVertical: space[3],
            opacity: props.locked ? 0.6 : 1,
          },
        ]}
      >
        <View>
          <IconBadge name={props.icon} tone={props.locked ? 'neutral' : 'brand'} />
          {props.locked && (
            <View style={[styles.lock, { backgroundColor: colors.textSecondary, borderColor: colors.surface }]}>
              <Ionicons name="lock-closed" size={9} color={colors.surface} />
            </View>
          )}
        </View>
        <AppText variant="caption" numberOfLines={2} align="center" style={{ marginTop: space[2] }}>
          {props.label}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: '25%', padding: 4 },
  tile: { alignItems: 'center', borderWidth: 1, minHeight: 96, paddingHorizontal: 4 },
  lock: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
