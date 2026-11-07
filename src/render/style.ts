export type Weight = 'thin' | 'normal' | 'thick';
export type Line = 'solid' | 'dashed' | 'dotted';
export type Fill = 'none' | 'solid' | 'hatch' | 'cross';
export type Tone = 'light' | 'dark' | 'black';
export type Look = 'clean' | 'hand';
export type Style = { weight: Weight; line: Line; fill: Fill; tone: Tone; look: Look };
export const DEFAULT_STYLE: Style = { weight: 'normal', line: 'solid', fill: 'none', tone: 'dark', look: 'clean' };
/** Internal width unit (same as Geometry.penWidth): thin 400, normal 600, thick 1000. */
export const WEIGHT_WIDTH: Record<Weight, number> = { thin: 400, normal: 600, thick: 1000 };

export const WEIGHTS: Weight[] = ['thin', 'normal', 'thick'];
export const LINES: Line[] = ['solid', 'dashed', 'dotted'];
export const FILLS: Fill[] = ['none', 'solid', 'hatch', 'cross'];
export const TONES: Tone[] = ['light', 'dark', 'black'];
export const LOOKS: Look[] = ['clean', 'hand'];

/** Pen colour of a solid fill: the device has two greys and black. */
export const TONE_COLOR: Record<Tone, 0 | 157 | 201> = { light: 201, dark: 157, black: 0 };
/**
 * Perpendicular gap between hatch lines in page px, 4 / 11 / 21 % ink
 * coverage at the normal-weight hatch line. A constant, not a function of the
 * box: the same style must read the same on a tall box and a wide one (GH-20).
 */
export const TONE_GAP: Record<Tone, number> = { light: 68, dark: 25, black: 13 };

/** Approximate page px for an internal width on a Manta (0.5 mm ≈ 600 ≈ 6 px). */
export function widthPx(width: number): number {
  return width / 100;
}

/** Width as written to the firmware: integers draw as hairlines, so every value carries a fraction. */
export function firmwareWidth(width: number): number {
  return Math.round(width) + 0.001;
}

/** Every value of each style key, in style-bar order. */
export const STYLE_VALUES: { [K in keyof Style]: readonly Style[K][] } = { weight: WEIGHTS, line: LINES, fill: FILLS, tone: TONES, look: LOOKS };
export const STYLE_KEYS = Object.keys(STYLE_VALUES) as (keyof Style)[];

/** Exactly the five style keys, each with a known value. */
export function isStyle(value: unknown): value is Style {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return Object.keys(o).length === STYLE_KEYS.length && STYLE_KEYS.every(k => (STYLE_VALUES[k] as readonly unknown[]).includes(o[k]));
}

/** Fill values written before tone existed, and what they mean now. */
const LEGACY_FILL: Record<string, Pick<Style, 'fill' | 'tone'>> = {
  none: { fill: 'none', tone: DEFAULT_STYLE.tone },
  hatch: { fill: 'hatch', tone: 'dark' },
  light: { fill: 'solid', tone: 'light' },
  dark: { fill: 'solid', tone: 'dark' },
};

/**
 * A style from a stored record, or null when it is not one. Records written
 * before GH-20 have four keys and a fill of none/hatch/light/dark; they are
 * upgraded here so saved settings and recipes in existing shapes keep working.
 */
export function readStyle(value: unknown): Style | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (isStyle(o)) {
    return { weight: o.weight, line: o.line, fill: o.fill, tone: o.tone, look: o.look };
  }
  if (Object.keys(o).length === 4 && typeof o.fill === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_FILL, o.fill)) {
    const up = { ...o, ...LEGACY_FILL[o.fill] };
    return isStyle(up) ? up : null;
  }
  return null;
}
