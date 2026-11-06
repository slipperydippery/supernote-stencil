export type Weight = 'thin' | 'normal' | 'thick';
export type Line = 'solid' | 'dashed' | 'dotted';
export type Fill = 'none' | 'hatch' | 'light' | 'dark';
export type Look = 'clean' | 'hand';
export type Style = { weight: Weight; line: Line; fill: Fill; look: Look };
export const DEFAULT_STYLE: Style = { weight: 'normal', line: 'solid', fill: 'none', look: 'clean' };
/** Internal width unit (same as Geometry.penWidth): thin 400, normal 600, thick 1000. */
export const WEIGHT_WIDTH: Record<Weight, number> = { thin: 400, normal: 600, thick: 1000 };

export const WEIGHTS: Weight[] = ['thin', 'normal', 'thick'];
export const LINES: Line[] = ['solid', 'dashed', 'dotted'];
export const FILLS: Fill[] = ['none', 'hatch', 'light', 'dark'];
export const LOOKS: Look[] = ['clean', 'hand'];

/** Approximate page px for an internal width on a Manta (0.5 mm ≈ 600 ≈ 6 px). */
export function widthPx(width: number): number {
  return width / 100;
}

/** Width as written to the firmware: integers draw as hairlines, so every value carries a fraction. */
export function firmwareWidth(width: number): number {
  return Math.round(width) + 0.001;
}

/** Every value of each style key, in style-bar order. */
export const STYLE_VALUES: { [K in keyof Style]: readonly Style[K][] } = { weight: WEIGHTS, line: LINES, fill: FILLS, look: LOOKS };

/** Exactly the four style keys, each with a known value. */
export function isStyle(value: unknown): value is Style {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    Object.keys(o).length === 4 &&
    (Object.keys(STYLE_VALUES) as (keyof Style)[]).every(k => (STYLE_VALUES[k] as readonly unknown[]).includes(o[k]))
  );
}
