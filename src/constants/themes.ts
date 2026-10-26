export type ThemeId = 'emerald' | 'midnight' | 'desert' | 'ocean' | 'rose';

/**
 * Brand colors for one mode. `primary` always carries white text (`onPrimary`),
 * so legacy screens that put '#fff' on primary stay readable in both modes.
 */
export interface BrandPalette {
  primary: string;
  primaryPressed: string;
  /** Tinted background for selected/active states */
  primarySoft: string;
  /** Text or icon drawn on primarySoft */
  onPrimarySoft: string;
  /** Large brand blocks (hero cards) — deeper than primary in dark mode */
  hero: string;
  accent: string;
  accentSoft: string;
  onAccentSoft: string;
}

export interface AppTheme {
  id: ThemeId;
  nameKey: string;
  light: BrandPalette;
  dark: BrandPalette;
}

const goldLight = { accent: '#B8913A', accentSoft: '#F5ECD6', onAccentSoft: '#6E5216' };
const goldDark = { accent: '#E0C077', accentSoft: '#3A3120', onAccentSoft: '#EBD59E' };

export const APP_THEMES: Record<ThemeId, AppTheme> = {
  emerald: {
    id: 'emerald',
    nameKey: 'themes.emerald',
    light: { primary: '#0F5C4A', primaryPressed: '#0B4839', primarySoft: '#E3EFEA', onPrimarySoft: '#0F5C4A', hero: '#0F5C4A', ...goldLight },
    dark: { primary: '#2E8F72', primaryPressed: '#267A61', primarySoft: '#163A30', onPrimarySoft: '#8FD6BF', hero: '#123A30', ...goldDark },
  },
  midnight: {
    id: 'midnight',
    nameKey: 'themes.midnight',
    light: { primary: '#24406B', primaryPressed: '#1B3254', primarySoft: '#E5EBF4', onPrimarySoft: '#24406B', hero: '#24406B', ...goldLight },
    dark: { primary: '#4A73B0', primaryPressed: '#3F6399', primarySoft: '#1B2A40', onPrimarySoft: '#B4CCEB', hero: '#18263D', ...goldDark },
  },
  desert: {
    id: 'desert',
    nameKey: 'themes.desert',
    light: { primary: '#8A4B2A', primaryPressed: '#723D21', primarySoft: '#F4E7DE', onPrimarySoft: '#7A3F21', hero: '#8A4B2A', ...goldLight },
    dark: { primary: '#B26B43', primaryPressed: '#9A5B37', primarySoft: '#3A251A', onPrimarySoft: '#EBC2A8', hero: '#3A2316', ...goldDark },
  },
  ocean: {
    id: 'ocean',
    nameKey: 'themes.ocean',
    light: {
      primary: '#0E5A73', primaryPressed: '#0A485C', primarySoft: '#E0EFF3', onPrimarySoft: '#0E5A73', hero: '#0E5A73',
      accent: '#2E9E8A', accentSoft: '#DDF2EE', onAccentSoft: '#1C6B5D',
    },
    dark: {
      primary: '#2A87A3', primaryPressed: '#23748C', primarySoft: '#133442', onPrimarySoft: '#9DD5E4', hero: '#0F3240',
      accent: '#5FCBB6', accentSoft: '#15362F', onAccentSoft: '#A6E5D8',
    },
  },
  rose: {
    id: 'rose',
    nameKey: 'themes.rose',
    light: { primary: '#7A3463', primaryPressed: '#652A52', primarySoft: '#F4E4EE', onPrimarySoft: '#6B2D57', hero: '#7A3463', ...goldLight },
    dark: { primary: '#A9558A', primaryPressed: '#924876', primarySoft: '#3A1C30', onPrimarySoft: '#EDBCDB', hero: '#361A2D', ...goldDark },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'emerald';
