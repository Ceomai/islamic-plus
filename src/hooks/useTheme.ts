import { useMemo } from 'react';
import { APP_THEMES } from '../constants/themes';
import { useApp } from '../context/AppContext';
import { buildThemeColors } from '../theme/colors';
import { component, fontWeight, motion, numeric, radius, space, type } from '../theme/tokens';

export function useTheme() {
  const { darkMode, settings } = useApp();
  const preset = APP_THEMES[settings.themeId] ?? APP_THEMES.emerald;

  return useMemo(
    () => ({
      dark: darkMode,
      themeId: settings.themeId,
      preset,
      space,
      radius,
      type,
      numeric,
      fontWeight,
      motion,
      component,
      colors: buildThemeColors(preset, darkMode),
    }),
    [darkMode, settings.themeId, preset]
  );
}

export type Theme = ReturnType<typeof useTheme>;
export type { ThemeColors } from '../theme/colors';
