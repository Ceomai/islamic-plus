import type { TextStyle } from 'react-native';

/**
 * Islamic+ design tokens — "Sakin modern" direction.
 * Warm neutral surfaces shared by every theme; each theme only swaps its brand colors.
 * Components read these through useTheme(); never hard-code hex values in screens.
 */

/** 4-pt spacing scale */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export type TypeVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'caption'
  | 'overline'
  | 'arabic';

export const type: Record<TypeVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  arabic: { fontSize: 24, lineHeight: 42, fontWeight: '400', writingDirection: 'rtl', textAlign: 'right' },
};

/** Neutral roles shared across themes */
export interface NeutralPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  overlay: string;
}

export const neutralLight: NeutralPalette = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE3',
  border: '#E6E0D5',
  borderStrong: '#D6CEC0',
  text: '#17231F',
  textSecondary: '#5E6B66',
  textMuted: '#8B9590',
  success: '#2E7D5A',
  successSoft: '#E3F1E9',
  warning: '#A86A12',
  warningSoft: '#FBEFD9',
  error: '#B42318',
  errorSoft: '#FCE9E7',
  overlay: 'rgba(14, 20, 18, 0.45)',
};

export const neutralDark: NeutralPalette = {
  background: '#0E1412',
  surface: '#171E1B',
  surfaceMuted: '#121815',
  border: '#252E2A',
  borderStrong: '#34403B',
  text: '#ECF1EE',
  textSecondary: '#A4B1AB',
  textMuted: '#75817C',
  success: '#5CC08F',
  successSoft: '#17301F',
  warning: '#E0A54A',
  warningSoft: '#33260F',
  error: '#F2867A',
  errorSoft: '#3A1A16',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
