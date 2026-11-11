import { Platform, type TextStyle } from 'react-native';

/**
 * Islamic+ design tokens — "Sakin modern" direction.
 *
 * Three layers:
 *  1. Primitives (`primitive`): raw values with no meaning attached. Only this file reads them.
 *  2. Semantic roles (`neutralLight`/`neutralDark`, brand palettes in constants/themes.ts):
 *     what a color is for (background, text, primaryText…). Screens read these through useTheme().
 *  3. Component tokens (`component`): values owned by one component (tab bar label, input border width).
 *
 * Never hard-code hex values, font sizes or radii in screens.
 */

/* ───────────────────────── 1. Primitives ───────────────────────── */

export const primitive = {
  white: '#FFFFFF',
  black: '#000000',
  sand: {
    50: '#F7F5F0',
    100: '#EFEBE3',
    200: '#E6E0D5',
    300: '#D6CEC0',
  },
  slate: {
    // warm green-grey ramp used for text and dark surfaces
    300: '#A4B1AB',
    400: '#8C948F',
    450: '#8A9691',
    500: '#66736D',
    600: '#626C67',
    650: '#5E6B66',
    700: '#34403B',
    750: '#252E2A',
    800: '#1D2522',
    850: '#171E1B',
    900: '#0E1412',
    950: '#17231F',
    50: '#ECF1EE',
  },
  green: {
    soft: '#E3F1E9',
    softDark: '#17301F',
    700: '#276B4D',
    300: '#5CC08F',
  },
  amber: {
    soft: '#FBEFD9',
    softDark: '#33260F',
    700: '#8F5A0E',
    300: '#E0A54A',
  },
  red: {
    soft: '#FCE9E7',
    softDark: '#3A1A16',
    700: '#B42318',
    300: '#F2867A',
  },
  category: {
    readingBg: '#E3EFEA',
    readingFg: '#0F5C4A',
    readingBgDark: '#163A30',
    readingFgDark: '#8FD6BF',
    worshipBg: '#F5ECD6',
    worshipFg: '#6E5216',
    worshipBgDark: '#3A3120',
    worshipFgDark: '#EBD59E',
    trackingBg: '#E5EBF4',
    trackingFg: '#24406B',
    trackingBgDark: '#1B2A40',
    trackingFgDark: '#B4CCEB',
  },
} as const;

/** White overlays drawn on the hero / primary surface (same in light and dark). */
export const onHeroTokens = {
  onHero: primitive.white,
  // 0.78 keeps ≥4.5:1 on every preset’s hero (0.72 was 4.4:1 on desert)
  onHeroMuted: 'rgba(255, 255, 255, 0.78)',
  heroDivider: 'rgba(255, 255, 255, 0.18)',
  heroChipBg: 'rgba(255, 255, 255, 0.14)',
  heroTrack: 'rgba(255, 255, 255, 0.30)',
} as const;

/* ───────────────────────── Spacing, radius, motion ───────────────────────── */

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
  12: 48,
  16: 64,
} as const;

/** Corner radii. Circles use size / 2 instead of a token. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Layout limits. `minTouch` is the platform minimum tap target (44pt HIG / 48dp Material);
 * `contentMaxWidth` keeps text columns readable on iPad and wide windows.
 */
export const layout = {
  minTouch: Platform.select({ android: 48, default: 44 }),
  contentMaxWidth: 680,
  bubbleMaxWidth: 560,
  /** Width breakpoints (dp) for denser grids on tablets */
  breakpoint: { tablet: 700, wide: 1000 },
} as const;

/** Motion — keep animations short and interruptible; respect Reduce Motion at the call site. */
export const motion = {
  duration: { fast: 150, base: 250, slow: 350 },
  spring: {
    /** Animated.spring config for press feedback */
    press: { speed: 40, bounciness: 0 },
    /** Animated.spring config for elements coming to rest */
    settle: { damping: 15, stiffness: 220 },
  },
  pressedOpacity: 0.7,
  pressedScale: 0.97,
} as const;

/* ───────────────────────── Typography ───────────────────────── */

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Font families. `undefined` = platform default (SF Pro / Roboto). Set a family here once a font is
 * bundled and every variant picks it up.
 */
export const fontFamily: { ui?: string; arabic?: string } = {
  ui: undefined,
  arabic: undefined,
};

export type TypeVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'calloutStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'arabicQuran'
  | 'arabicDua'
  | 'arabicPreview';

const ui = (style: TextStyle): TextStyle => (fontFamily.ui ? { fontFamily: fontFamily.ui, ...style } : style);
const arabic = (style: TextStyle): TextStyle => ({
  ...(fontFamily.arabic ? { fontFamily: fontFamily.arabic } : null),
  fontWeight: fontWeight.regular,
  writingDirection: 'rtl',
  textAlign: 'right',
  ...style,
});

/** Elderly-friendly scale: caption (13) is the floor — nothing in the app is smaller. */
export const type: Record<TypeVariant, TextStyle> = {
  display: ui({ fontSize: 32, lineHeight: 40, fontWeight: fontWeight.bold, letterSpacing: -0.3 }),
  title: ui({ fontSize: 24, lineHeight: 30, fontWeight: fontWeight.bold, letterSpacing: -0.2 }),
  heading: ui({ fontSize: 18, lineHeight: 24, fontWeight: fontWeight.semibold }),
  body: ui({ fontSize: 17, lineHeight: 26, fontWeight: fontWeight.regular }),
  bodyStrong: ui({ fontSize: 17, lineHeight: 26, fontWeight: fontWeight.semibold }),
  callout: ui({ fontSize: 15, lineHeight: 22, fontWeight: fontWeight.regular }),
  calloutStrong: ui({ fontSize: 15, lineHeight: 22, fontWeight: fontWeight.semibold }),
  caption: ui({ fontSize: 13, lineHeight: 18, fontWeight: fontWeight.regular }),
  captionStrong: ui({ fontSize: 13, lineHeight: 18, fontWeight: fontWeight.semibold }),
  overline: ui({ fontSize: 12, lineHeight: 16, fontWeight: fontWeight.semibold, letterSpacing: 0.5 }),
  arabicQuran: arabic({ fontSize: 28, lineHeight: 52 }),
  arabicDua: arabic({ fontSize: 26, lineHeight: 46 }),
  arabicPreview: arabic({ fontSize: 20, lineHeight: 36 }),
};

/** Tabular figures so prayer times, countdowns and counters don't jitter as digits change. */
export const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

/* ───────────────────────── 2. Semantic neutral roles ───────────────────────── */

export type HomeCategory = 'reading' | 'worship' | 'tracking' | 'tools';

/** Neutral roles shared across themes */
export interface NeutralPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  /** Unfocused text-field border (≥3:1 against surface) */
  inputBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  /** Text on a solid error fill */
  onError: string;
  errorSoft: string;
  overlay: string;
  /** Home launcher icon colors per feature category */
  category: Record<HomeCategory, { bg: string; fg: string }>;
}

export const neutralLight: NeutralPalette = {
  background: primitive.sand[50],
  surface: primitive.white,
  surfaceMuted: primitive.sand[100],
  border: primitive.sand[200],
  borderStrong: primitive.sand[300],
  inputBorder: primitive.slate[400],
  text: primitive.slate[950],
  textSecondary: primitive.slate[650],
  textMuted: primitive.slate[600],
  success: primitive.green[700],
  successSoft: primitive.green.soft,
  warning: primitive.amber[700],
  warningSoft: primitive.amber.soft,
  error: primitive.red[700],
  onError: primitive.white,
  errorSoft: primitive.red.soft,
  overlay: 'rgba(14, 20, 18, 0.45)',
  category: {
    reading: { bg: primitive.category.readingBg, fg: primitive.category.readingFg },
    worship: { bg: primitive.category.worshipBg, fg: primitive.category.worshipFg },
    tracking: { bg: primitive.category.trackingBg, fg: primitive.category.trackingFg },
    tools: { bg: primitive.sand[100], fg: primitive.slate[650] },
  },
};

export const neutralDark: NeutralPalette = {
  background: primitive.slate[900],
  surface: primitive.slate[850],
  // Lighter than surface so muted panels and pressed rows separate from cards
  surfaceMuted: primitive.slate[800],
  border: primitive.slate[750],
  borderStrong: primitive.slate[700],
  inputBorder: primitive.slate[500],
  text: primitive.slate[50],
  textSecondary: primitive.slate[300],
  textMuted: primitive.slate[450],
  success: primitive.green[300],
  successSoft: primitive.green.softDark,
  warning: primitive.amber[300],
  warningSoft: primitive.amber.softDark,
  error: primitive.red[300],
  // The light red of dark mode needs dark text
  onError: primitive.slate[900],
  errorSoft: primitive.red.softDark,
  overlay: 'rgba(0, 0, 0, 0.6)',
  category: {
    reading: { bg: primitive.category.readingBgDark, fg: primitive.category.readingFgDark },
    worship: { bg: primitive.category.worshipBgDark, fg: primitive.category.worshipFgDark },
    tracking: { bg: primitive.category.trackingBgDark, fg: primitive.category.trackingFgDark },
    tools: { bg: primitive.slate[800], fg: primitive.slate[300] },
  },
};

/* ───────────────────────── 3. Component tokens ───────────────────────── */

export const component = {
  tabBar: { label: { fontSize: type.overline.fontSize, fontWeight: fontWeight.semibold } },
  textField: { borderWidth: 1, borderWidthFocused: 1.5, minHeight: 48 },
  /** The big number inside the tasbih counter */
  tasbihCounter: ui({ fontSize: 64, lineHeight: 72, fontWeight: fontWeight.bold }),
} as const;

/** Home launcher grid columns for a window width: 4 on phones, 6 on small tablets, 8 on wide windows. */
export function launcherColumns(width: number): number {
  if (width >= layout.breakpoint.wide) return 8;
  if (width >= layout.breakpoint.tablet) return 6;
  return 4;
}
