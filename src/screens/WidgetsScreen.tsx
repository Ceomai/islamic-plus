import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, Screen, Surface } from '../ui';

/**
 * The phone's home-screen widget. The in-app "widget module" it used to configure is now the
 * dua of the day card, so only the instructions are left here.
 */
export function WidgetsScreen() {
  const { colors, space } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <Surface variant="soft" style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
        <Ionicons name="phone-portrait-outline" size={24} color={colors.onPrimarySoft} />
        <View style={{ flex: 1, gap: space[2] }}>
          <AppText variant="callout" color={colors.onPrimarySoft}>
            {t('widgets.intro')}
          </AppText>
          <AppText variant="callout" tone="secondary">
            {t('widgets.nativeNote')}
          </AppText>
        </View>
      </Surface>
    </Screen>
  );
}
