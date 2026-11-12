import type { AppTheme } from '../constants/themes';
import { neutralDark, neutralLight, onHeroTokens, primitive } from './tokens';

/** Resolves the semantic color roles for one brand preset and mode (pure, so tests can check contrast). */
export function buildThemeColors(preset: AppTheme, dark: boolean) {
  const neutral = dark ? neutralDark : neutralLight;
  const brand = dark ? preset.dark : preset.light;
  return {
    ...neutral,
    ...brand,
    ...onHeroTokens,
    onPrimary: primitive.white,
  };
}

export type ThemeColors = ReturnType<typeof buildThemeColors>;
