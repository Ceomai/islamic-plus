export type ThemeId = 'emerald' | 'midnight' | 'desert' | 'ocean' | 'rose';

/**
 * Brand colors for one mode. `primary` is a fill color and always carries white text (`onPrimary`);
 * brand-colored text and icons on background/surface use `primaryText`, which is tuned for ≥4.5:1.
 */
export interface BrandPalette {
  primary: string;
  primaryPressed: string;
  /** Brand-colored text, links and icons on background/surface */
  primaryText: string;
  /** Tinted background for selected/active states */
  primarySoft: string;
  /** Text or icon drawn on primarySoft */
  onPrimarySoft: string;
  /** Large brand blocks (hero cards) — deeper than primary in dark mode */
  hero: string;
  /** Accent text drawn on the hero surface (e.g. time remaining) */
  onHeroAccent: string;
  /** Accent fill (dots, markers); not for small text on light surfaces */
  accent: string;
  /** Accent-colored text on background/surface (e.g. ayah number markers) */
  accentText: string;
  accentSoft: string;
  onAccentSoft: string;
}

export interface AppTheme {
  id: ThemeId;
  nameKey: string;
  light: BrandPalette;
  dark: BrandPalette;
}

const goldLight = { accent: '#B8913A', accentText: '#8A6A1F', accentSoft: '#F5ECD6', onAccentSoft: '#6E5216', onHeroAccent: '#E3C36E' };
const goldDark = { accent: '#E0C077', accentText: '#E0C077', accentSoft: '#3A3120', onAccentSoft: '#EBD59E', onHeroAccent: '#E0C077' };

export const APP_THEMES: Record<ThemeId, AppTheme> = {
  emerald: {
    id: 'emerald',
    nameKey: 'themes.emerald',
    light: { primary: '#0F5C4A', primaryPressed: '#0B4839', primaryText: '#0F5C4A', primarySoft: '#E3EFEA', onPrimarySoft: '#0F5C4A', hero: '#0F5C4A', ...goldLight },
    dark: { primary: '#237A61', primaryPressed: '#1D6853', primaryText: '#4FB394', primarySoft: '#163A30', onPrimarySoft: '#8FD6BF', hero: '#123A30', ...goldDark },
  },
  midnight: {
    id: 'midnight',
    nameKey: 'themes.midnight',
    light: { primary: '#24406B', primaryPressed: '#1B3254', primaryText: '#24406B', primarySoft: '#E5EBF4', onPrimarySoft: '#24406B', hero: '#24406B', ...goldLight },
    dark: { primary: '#4A73B0', primaryPressed: '#3F6399', primaryText: '#7FA3D9', primarySoft: '#1B2A40', onPrimarySoft: '#B4CCEB', hero: '#18263D', ...goldDark },
  },
  desert: {
    id: 'desert',
    nameKey: 'themes.desert',
    // The standard gold only reaches 3.9:1 on the brown hero, so desert uses a lighter gold there
    light: { primary: '#8A4B2A', primaryPressed: '#723D21', primaryText: '#8A4B2A', primarySoft: '#F4E7DE', onPrimarySoft: '#7A3F21', hero: '#8A4B2A', ...goldLight, onHeroAccent: '#F0D78F' },
    dark: { primary: '#985A37', primaryPressed: '#844D2F', primaryText: '#D49A75', primarySoft: '#3A251A', onPrimarySoft: '#EBC2A8', hero: '#3A2316', ...goldDark },
  },
  ocean: {
    id: 'ocean',
    nameKey: 'themes.ocean',
    light: {
      primary: '#0E5A73', primaryPressed: '#0A485C', primaryText: '#0E5A73', primarySoft: '#E0EFF3', onPrimarySoft: '#0E5A73', hero: '#0E5A73',
      onHeroAccent: '#8FE0CF', accent: '#2E9E8A', accentText: '#1C6B5D', accentSoft: '#DDF2EE', onAccentSoft: '#1C6B5D',
    },
    dark: {
      primary: '#22738C', primaryPressed: '#1C6278', primaryText: '#5BB3CC', primarySoft: '#133442', onPrimarySoft: '#9DD5E4', hero: '#0F3240',
      onHeroAccent: '#5FCBB6', accent: '#5FCBB6', accentText: '#5FCBB6', accentSoft: '#15362F', onAccentSoft: '#A6E5D8',
    },
  },
  rose: {
    id: 'rose',
    nameKey: 'themes.rose',
    light: { primary: '#7A3463', primaryPressed: '#652A52', primaryText: '#7A3463', primarySoft: '#F4E4EE', onPrimarySoft: '#6B2D57', hero: '#7A3463', ...goldLight },
    dark: { primary: '#A9558A', primaryPressed: '#924876', primaryText: '#D98BBD', primarySoft: '#3A1C30', onPrimarySoft: '#EDBCDB', hero: '#361A2D', ...goldDark },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'emerald';
