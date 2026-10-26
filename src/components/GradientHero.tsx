import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * Brand hero block. The "Sakin modern" direction is flat, so this is a solid hero-colored
 * panel; the name is kept so existing screens don't need to change.
 */
export function GradientHero({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.hero, borderRadius: radius.xl, padding: space[6], marginBottom: space[4] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HeroTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, type } = useTheme();
  return (
    <View>
      <Text style={[type.title, { color: colors.onHero }]}>{title}</Text>
      {subtitle ? <Text style={[type.callout, styles.subtitle, { color: colors.onHeroMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 6 },
});
