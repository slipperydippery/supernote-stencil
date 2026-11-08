export type Weight = 'thin' | 'normal' | 'thick';
export type Line = 'solid' | 'dashed' | 'dotted' | 'none';
export type Fill = 'none' | 'solid' | 'hatch' | 'cross';
export type Tone = 'light' | 'dark' | 'black';
export type Ink = 'light' | 'dark' | 'black';
export type Look = 'clean' | 'hand';
export type Style = { weight: Weight; line: Line; fill: Fill; tone: Tone; ink: Ink; look: Look };
export const DEFAULT_STYLE: Style = { weight: 'normal', line: 'solid', fill: 'none', tone: 'dark', ink: 'black', look: 'clean' };
/** Internal width unit (same as Geometry.penWidth): thin 400, normal 600, thick 1000. */
export const WEIGHT_WIDTH: Record<Weight, number> = { thin: 400, normal: 600, thick: 1000 };

export const WEIGHTS: Weight[] = ['thin', 'normal', 'thick'];
export const LINES: Line[] = ['solid', 'dashed', 'dotted', 'none'];
export const FILLS: Fill[] = ['none', 'solid', 'hatch', 'cross'];
export const TONES: Tone[] = ['light', 'dark', 'black'];
export const INKS: Ink[] = ['light', 'dark', 'black'];
export const LOOKS: Look[] = ['clean', 'hand'];

/** Pen colour of a solid fill: the device has two greys and black. */
export const TONE_COLOR: Record<Tone, 0 | 157 | 201> = { light: 201, dark: 157, black: 0 };
/** Pen colour of outlines, arrow heads and head fills. */
export const INK_COLOR: Record<Ink, 0 | 157 | 201> = { light: 201, dark: 157, black: 0 };
/** Hatch line width as a share of the shape's weight width. */
export const HATCH_SHARE = 0.45;

/** Hatch ink coverage in percent per tone, and the range a setting can step through in 1 % steps. */
export const TONE_COVERAGE: Record<Tone, number> = { light: 4, dark: 11, black: 21 };
export const COVERAGE_MIN = 1;
export const COVERAGE_MAX = 66;

/**
 * Perpendicular gap in page px between hatch lines that cover `percent` of
 * the area, at the normal-weight hatch line. A constant per tone, not a
 * function of the box: the same style must read the same on a tall box and a
 * wide one (GH-20).
 */
export function hatchGap(percent: number): number {
  return (widthPx(HATCH_SHARE * WEIGHT_WIDTH.normal) * 100) / percent;
}

/** The built-in gaps, about 68 / 25 / 13 px. */
export const TONE_GAP = Object.fromEntries(TONES.map(t => [t, hatchGap(TONE_COVERAGE[t])])) as Record<Tone, number>;

/** Approximate page px for an internal width on a Manta (0.5 mm ≈ 600 ≈ 6 px). */
export function widthPx(width: number): number {
  return width / 100;
}

/** Width as written to the firmware: integers draw as hairlines, so every value carries a fraction. */
export function firmwareWidth(width: number): number {
  return Math.round(width) + 0.001;
}

/** Every value of each style key, in style-bar order. */
export const STYLE_VALUES: { [K in keyof Style]: readonly Style[K][] } = { weight: WEIGHTS, line: LINES, fill: FILLS, tone: TONES, ink: INKS, look: LOOKS };
export const STYLE_KEYS = Object.keys(STYLE_VALUES) as (keyof Style)[];

/** Exactly the six style keys, each with a known value. */
export function isStyle(value: unknown): value is Style {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return Object.keys(o).length === STYLE_KEYS.length && STYLE_KEYS.every(k => (STYLE_VALUES[k] as readonly unknown[]).includes(o[k]));
}

/**
 * Fill values written before tone existed, and what they mean now. 1.0.0
 * hatched at 0.059·h perpendicular, 14–18 px on the default boxes, so black
 * (13 px) is the tone that redraws an old hatched shape closest to how it was.
 */
const LEGACY_FILL: Record<string, Pick<Style, 'fill' | 'tone'>> = {
  none: { fill: 'none', tone: DEFAULT_STYLE.tone },
  hatch: { fill: 'hatch', tone: 'black' },
  light: { fill: 'solid', tone: 'light' },
  dark: { fill: 'solid', tone: 'dark' },
};

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * A style from a stored record, or null when it is not one. Older records are
 * upgraded so saved settings and recipes in existing shapes keep working:
 * five keys without ink (before GH-50) read as ink black, and four keys
 * (before GH-20) also have a fill of none/hatch/light/dark.
 */
export function readStyle(value: unknown): Style | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  let o = value as Record<string, unknown>;
  const n = Object.keys(o).length;
  if (n === 4 && !has(o, 'tone') && !has(o, 'ink') && typeof o.fill === 'string' && has(LEGACY_FILL, o.fill)) {
    o = { ...o, ...LEGACY_FILL[o.fill], ink: 'black' };
  } else if (n === STYLE_KEYS.length - 1 && !has(o, 'ink')) {
    o = { ...o, ink: 'black' };
  }
  if (!isStyle(o)) {
    return null;
  }
  return { weight: o.weight, line: o.line, fill: o.fill, tone: o.tone, ink: o.ink, look: o.look };
}
