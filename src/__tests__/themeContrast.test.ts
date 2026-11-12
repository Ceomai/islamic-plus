import { describe, expect, it } from '@jest/globals';
import { APP_THEMES, type ThemeId } from '../constants/themes';
import { buildThemeColors, type ThemeColors } from '../theme/colors';
import { contrastRatio } from '../utils/contrast';

type ColorKey = { [K in keyof ThemeColors]: ThemeColors[K] extends string ? K : never }[keyof ThemeColors];

/** [foreground, background, minimum ratio] — 4.5 for text, 3 for borders and large UI parts */
const PAIRS: [ColorKey, ColorKey, number][] = [
  ['text', 'background', 4.5],
  ['text', 'surface', 4.5],
  ['textSecondary', 'background', 4.5],
  ['textMuted', 'background', 4.5],
  ['textMuted', 'surface', 4.5],
  ['primaryText', 'background', 4.5],
  ['primaryText', 'surface', 4.5],
  ['accentText', 'background', 4.5],
  ['accentText', 'surface', 4.5],
  ['onPrimary', 'primary', 4.5],
  ['onPrimarySoft', 'primarySoft', 4.5],
  ['onAccentSoft', 'accentSoft', 4.5],
  ['onHero', 'hero', 4.5],
  ['onHeroMuted', 'hero', 4.5],
  ['onHeroAccent', 'hero', 4.5],
  ['success', 'successSoft', 4.5],
  ['warning', 'warningSoft', 4.5],
  ['error', 'errorSoft', 4.5],
  ['error', 'errorSoftPressed', 4.5],
  ['onError', 'error', 4.5],
  ['inputBorder', 'surface', 3],
];

const presets = Object.keys(APP_THEMES) as ThemeId[];

describe('theme token contrast (WCAG 2.2)', () => {
  for (const id of presets) {
    for (const dark of [false, true]) {
      const colors = buildThemeColors(APP_THEMES[id], dark);
      const mode = dark ? 'dark' : 'light';

      it.each(PAIRS)(`${id}/${mode}: %s on %s ≥ %d`, (fg, bg, min) => {
        expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
      });

      it(`${id}/${mode}: home category icons are readable`, () => {
        for (const { fg, bg } of Object.values(colors.category)) {
          expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  it('measures known reference pairs', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('rgba(255, 255, 255, 0)', '#000000')).toBeCloseTo(1, 5);
  });
});
