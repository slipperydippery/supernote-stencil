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
