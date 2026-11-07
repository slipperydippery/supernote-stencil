import { SHAPES, type ShapeId } from '../shapes';
import { readStyle, type Style } from './style';

export type Recipe = { v: 1; shape: ShapeId; style: Style; seed: number; flip?: { x?: boolean; y?: boolean } };

export function serializeRecipe(r: Recipe): string {
  const { weight, line, fill, tone, look } = r.style;
  const out: { v: 1; shape: ShapeId; style: Style; seed: number; flip?: { x?: boolean; y?: boolean } } = {
    v: r.v,
    shape: r.shape,
    style: { weight, line, fill, tone, look },
    seed: r.seed,
  };
  if (r.flip?.x || r.flip?.y) {
    out.flip = { ...(r.flip.x ? { x: true } : {}), ...(r.flip.y ? { y: true } : {}) };
  }
  return JSON.stringify(out);
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
  // Recipes written before GH-20 carry a four-key style; readStyle upgrades them.
  const style = readStyle(o.style);
  if (
    typeof o.shape !== 'string' ||
    !Object.prototype.hasOwnProperty.call(SHAPES, o.shape) ||
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
  return {
    v: 1,
    shape: o.shape,
    style,
    seed: o.seed,
    ...(flip ? { flip } : {}),
  };
}
