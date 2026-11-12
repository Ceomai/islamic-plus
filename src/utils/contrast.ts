/** WCAG 2.x contrast helpers for `#RRGGBB` and `rgba(r, g, b, a)` colors. */

type Rgb = [number, number, number];

function parse(color: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color);
  if (rgba) {
    return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) };
  }
  throw new Error(`Unsupported color: ${color}`);
}

/** Composites a possibly translucent foreground over an opaque background. */
function flatten(color: string, over: Rgb): Rgb {
  const { rgb, alpha } = parse(color);
  return rgb.map((c, i) => c * alpha + over[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio (1–21) of `foreground` drawn on an opaque `background`. */
export function contrastRatio(foreground: string, background: string): number {
  const bg = parse(background);
  if (bg.alpha !== 1) throw new Error(`Background must be opaque: ${background}`);
  const a = luminance(flatten(foreground, bg.rgb));
  const b = luminance(bg.rgb);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
