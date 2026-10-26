import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { IconBadge } from './IconBadge';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: 'brand' | 'accent' | 'neutral' | 'danger';
  /** Right-side text (time, count, value) */
  value?: string;
  /** Custom right-side element (switch, badge) — replaces value and chevron */
  trailing?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  divider?: boolean;
  destructive?: boolean;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  value,
  trailing,
  onPress,
  showChevron = !!onPress,
  divider,
  destructive,
}: Props) {
  const { colors, space } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        { paddingVertical: space[3], gap: space[3] },
        divider ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : null,
      ]}
    >
      {icon ? <IconBadge name={icon} size="sm" tone={destructive ? 'danger' : iconTone} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (
        <>
          {value ? (
            <AppText variant="callout" tone="secondary">
              {value}
            </AppText>
          ) : null}
          {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});
