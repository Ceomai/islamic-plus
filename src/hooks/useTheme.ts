import { useMemo } from 'react';
import { APP_THEMES } from '../constants/themes';
import { useAppearance } from '../context/AppContext';
import { buildThemeColors } from '../theme/colors';
import { component, fontWeight, layout, motion, numeric, radius, space, type } from '../theme/tokens';

export function useTheme() {
  const { darkMode, themeId } = useAppearance();
  const preset = APP_THEMES[themeId] ?? APP_THEMES.emerald;

  return useMemo(
    () => ({
      dark: darkMode,
      themeId,
      preset,
      space,
      radius,
      type,
      numeric,
      fontWeight,
      motion,
      layout,
      component,
      colors: buildThemeColors(preset, darkMode),
    }),
    [darkMode, themeId, preset]
  );
}

export type Theme = ReturnType<typeof useTheme>;
export type { ThemeColors } from '../theme/colors';
