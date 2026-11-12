import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText } from '../../ui';

export type PermissionState = 'unknown' | 'granted' | 'denied';

/** Result of a permission request on an onboarding step; nothing until the user has been asked */
export function PermissionNote({ state, deniedKey }: { state: PermissionState; deniedKey: string }) {
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  if (state === 'unknown') return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] }}>
      <Ionicons
        name={state === 'granted' ? 'checkmark-circle' : 'alert-circle-outline'}
        size={18}
        color={state === 'granted' ? colors.primary : colors.textSecondary}
      />
      <AppText variant="callout" tone={state === 'granted' ? 'brand' : 'secondary'} style={{ flex: 1 }}>
        {state === 'granted' ? t('onboarding.granted') : t(deniedKey)}
      </AppText>
    </View>
  );
}
