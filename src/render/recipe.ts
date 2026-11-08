import { readShapeId, type ShapeId } from '../shapes';
import { readStyle, TONE_GAP, type Style, type Tone } from './style';

/**
 * `gap` is the hatch spacing the shape was drawn with, so a later change to
 * the setting does not re-space it on redraw. Absent on unhatched shapes and
 * on shapes placed before the setting existed, which used TONE_GAP.
 */
export type Recipe = { v: 1; shape: ShapeId; style: Style; seed: number; flip?: { x?: boolean; y?: boolean }; gap?: number };

export function serializeRecipe(r: Recipe): string {
  const { weight, line, fill, tone, ink, look } = r.style;
  const out: Recipe = {
    v: r.v,
    shape: r.shape,
    style: { weight, line, fill, tone, ink, look },
    seed: r.seed,
  };
  if (r.flip?.x || r.flip?.y) {
    out.flip = { ...(r.flip.x ? { x: true } : {}), ...(r.flip.y ? { y: true } : {}) };
  }
  if (r.gap !== undefined) {
    out.gap = r.gap;
  }
  return JSON.stringify(out);
}

const hatched = (style: Style) => style.fill === 'hatch' || style.fill === 'cross';

/** The recipe field for a gap: only hatch and cross have spacing to remember. */
export function gapField(style: Style, gap: number): Pick<Recipe, 'gap'> {
  return hatched(style) ? { gap } : {};
}

/**
 * Redraw keeps a hatched shape's own spacing while its tone is unchanged; a
 * new tone, or a shape that had no hatch, takes the current setting.
 */
export function redrawGap(recipe: Recipe, style: Style, gaps: Record<Tone, number>): number {
  if (style.tone === recipe.style.tone && hatched(recipe.style)) {
    return recipe.gap ?? TONE_GAP[style.tone];
  }
  return gaps[style.tone];
}

export function parseRecipe(s: string | null | undefined): Recipe | null {
  if (!s) {
    return null;
  }
  let o: any;
  try {
    o = JSON.parse(s);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.v !== 1) {
    return null;
  }
  // Recipes written before GH-50 (and GH-20) carry five- or four-key styles; readStyle upgrades them.
  const style = readStyle(o.style);
  // Recipes written before GH-45 may name arrowDown; readShapeId maps it to arrow.
  const shape = readShapeId(o.shape);
  if (
    !shape ||
    !style ||
    typeof o.seed !== 'number' ||
    !Number.isFinite(o.seed)
  ) {
    return null;
  }
  let flip: Recipe['flip'];
  if (o.flip !== undefined) {
    if (!o.flip || typeof o.flip !== 'object' || (o.flip.x !== undefined && typeof o.flip.x !== 'boolean') || (o.flip.y !== undefined && typeof o.flip.y !== 'boolean')) {
      return null;
    }
    flip = { ...(o.flip.x !== undefined ? { x: o.flip.x } : {}), ...(o.flip.y !== undefined ? { y: o.flip.y } : {}) };
  }
  if (o.gap !== undefined && !(typeof o.gap === 'number' && o.gap > 0 && Number.isFinite(o.gap))) {
    return null;
  }
  return {
    v: 1,
    shape,
    style,
    seed: o.seed,
    ...(flip ? { flip } : {}),
    ...(o.gap !== undefined ? { gap: o.gap } : {}),
  };
}
