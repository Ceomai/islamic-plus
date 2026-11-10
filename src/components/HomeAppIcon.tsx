import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { HomeCategory } from '../theme/tokens';
import { AppText } from '../ui/AppText';
import { IconBadge } from '../ui/IconBadge';

const LOCK_SIZE = 18;

/** Launcher tile: white card with an icon tinted by its category; a lock badge marks guest-restricted features. */
export function HomeAppIcon(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  category: HomeCategory;
  locked?: boolean;
  onPress: () => void;
}) {
  const { colors, radius, space } = useTheme();
  return (
    <View style={[styles.cell, { padding: space[1] }]}>
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
            paddingHorizontal: space[1],
            opacity: props.locked ? 0.6 : 1,
          },
        ]}
      >
        <View>
          <IconBadge
            name={props.icon}
            tone="neutral"
            palette={props.locked ? undefined : colors.category[props.category]}
          />
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
  cell: { width: '25%' },
  tile: { alignItems: 'center', borderWidth: 1, minHeight: 96 },
  lock: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: LOCK_SIZE,
    height: LOCK_SIZE,
    borderRadius: LOCK_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
