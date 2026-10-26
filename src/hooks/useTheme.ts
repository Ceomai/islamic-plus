import { useMemo } from 'react';
import { APP_THEMES } from '../constants/themes';
import { useApp } from '../context/AppContext';
import { neutralDark, neutralLight, radius, space, type } from '../theme/tokens';

export function useTheme() {
  const { darkMode, settings } = useApp();
  const preset = APP_THEMES[settings.themeId] ?? APP_THEMES.emerald;

  return useMemo(() => {
    const neutral = darkMode ? neutralDark : neutralLight;
    const brand = darkMode ? preset.dark : preset.light;
    return {
      dark: darkMode,
      themeId: settings.themeId,
      preset,
      space,
      radius,
      type,
      colors: {
        ...neutral,
        ...brand,
        onPrimary: '#FFFFFF',
        onHero: '#FFFFFF',
        onHeroMuted: 'rgba(255, 255, 255, 0.72)',
        // Legacy aliases — older screens still read these names
        primaryLight: brand.primary,
        primaryDark: brand.primaryPressed,
        accentLight: brand.accentSoft,
        textOnPrimary: '#FFFFFF',
        gradient: [brand.hero, brand.hero, brand.hero] as [string, string, string],
      },
    };
  }, [darkMode, settings.themeId, preset]);
}

export type Theme = ReturnType<typeof useTheme>;
export type ThemeColors = Theme['colors'];
