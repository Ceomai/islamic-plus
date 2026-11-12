import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { GuestRestrictedFeatureId } from '../config/featureAccess';
import { useAuth } from '../context/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, Button } from '../ui';

/** Blocks a screen for guests no matter how it was reached (home icon, settings link, deep link). */
export function withGuestGate<P extends object>(
  featureId: GuestRestrictedFeatureId,
  Screen: React.ComponentType<P>
): React.ComponentType<P> {
  function GatedScreen(props: P) {
    const { canAccess } = useFeatureAccess();
    const { logout } = useAuth();
    const { colors, space } = useTheme();
    const { t } = useTranslation();

    if (canAccess(featureId)) return <Screen {...props} />;

    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: space[6], gap: space[3] }]}>
        <Ionicons name="lock-closed" size={40} color={colors.primaryText} />
        <AppText variant="heading" align="center">
          {t('home.guestLocked')}
        </AppText>
        <AppText variant="callout" tone="secondary" align="center">
          {t('auth.guestBanner')}
        </AppText>
        <Button label={t('auth.signInOrRegister')} onPress={logout} style={{ marginTop: space[2] }} />
      </View>
    );
  }
  GatedScreen.displayName = `GuestGate(${featureId})`;
  return GatedScreen;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
