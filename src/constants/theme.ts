import { neutralLight, type as typeScale } from '../theme/tokens';

/**
 * Legacy constants kept for screens not yet moved to the design system.
 * New code should use useTheme() (colors, space, radius, type) and src/ui components.
 */
export const colors = {
  ...neutralLight,
  primary: '#0F5C4A',
  accent: '#B8913A',
  textOnPrimary: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: typeScale.title,
  heading: typeScale.heading,
  body: typeScale.body,
  caption: typeScale.caption,
  label: { fontSize: 14, fontWeight: '500' as const },
};

export const prayerLabels: Record<string, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};
