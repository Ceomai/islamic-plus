import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export function HomeAppIcon(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  locked?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={props.onPress} style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: props.color ?? colors.primary }]}>
        <Ionicons name={props.icon} size={22} color="#fff" />
        {props.locked && (
          <View style={styles.lock}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '25%', paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontSize: 12, textAlign: 'center' },
  lock: { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 2 },
});
