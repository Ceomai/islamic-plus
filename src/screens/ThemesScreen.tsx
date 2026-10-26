import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { APP_THEMES, type ThemeId } from '../constants/themes';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, Screen } from '../ui';

const THEME_IDS = Object.keys(APP_THEMES) as ThemeId[];

export function ThemesScreen() {
  const { settings, setThemeId } = useApp();
  const { colors, dark, radius, space } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('themes.intro')}
      </AppText>
      {THEME_IDS.map((id) => {
        const theme = dark ? APP_THEMES[id].dark : APP_THEMES[id].light;
        const selected = settings.themeId === id;
        return (
          <Pressable
            key={id}
            onPress={() => setThemeId(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={t(APP_THEMES[id].nameKey)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[3],
              padding: space[3],
              marginBottom: space[3],
              borderRadius: radius.lg,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.primary : colors.border,
              backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            })}
          >
            {/* Mini preview: hero block, accent dot and a soft surface */}
            <View style={{ width: 64, height: 48, borderRadius: radius.md, overflow: 'hidden', backgroundColor: theme.primarySoft }}>
              <View style={{ height: 24, backgroundColor: theme.hero, justifyContent: 'center', paddingLeft: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t(APP_THEMES[id].nameKey)}</AppText>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: space[1] }}>
                {[theme.primary, theme.accent, theme.primarySoft].map((c) => (
                  <View key={c} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c, borderWidth: 1, borderColor: colors.border }} />
                ))}
              </View>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={24} color={theme.primary} /> : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}
