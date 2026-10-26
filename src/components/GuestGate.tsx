import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GuestRestrictedFeatureId } from '../config/featureAccess';
import { useAuth } from '../context/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

/** Blocks a screen for guests no matter how it was reached (home icon, settings link, deep link). */
export function withGuestGate<P extends object>(
  featureId: GuestRestrictedFeatureId,
  Screen: React.ComponentType<P>
): React.ComponentType<P> {
  function GatedScreen(props: P) {
    const { canAccess } = useFeatureAccess();
    const { logout } = useAuth();
    const { colors } = useTheme();
    const { t } = useTranslation();

    if (canAccess(featureId)) return <Screen {...props} />;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={40} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{t('home.guestLocked')}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{t('auth.guestBanner')}</Text>
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={logout}>
          <Text style={styles.buttonText}>{t('auth.signInOrRegister')}</Text>
        </Pressable>
      </View>
    );
  }
  GatedScreen.displayName = `GuestGate(${featureId})`;
  return GatedScreen;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
