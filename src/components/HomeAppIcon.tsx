import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { HomeCategory } from '../theme/tokens';
import { AppText } from '../ui/AppText';
import { IconBadge } from '../ui/IconBadge';
import { PressableScale } from '../ui/PressableScale';

const LOCK_SIZE = 18;

/** Launcher tile: white card with an icon tinted by its category; a lock badge marks guest-restricted features. */
export function HomeAppIcon(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  category: HomeCategory;
  locked?: boolean;
  /** Tiles per row (4 on phones, more on tablets) */
  columns?: number;
  onPress: () => void;
}) {
  const { colors, radius, space } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ width: `${100 / (props.columns ?? 4)}%`, padding: space[1] }}>
      <PressableScale
        onPress={props.onPress}
        accessibilityRole="button"
        accessibilityLabel={props.label}
        accessibilityHint={props.locked ? t('home.lockedHint') : undefined}
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
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
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
