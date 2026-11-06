import { SHAPES, type Box, type ShapeDef, type ShapeId } from '../src/shapes';

export const ALL_IDS = Object.keys(SHAPES) as ShapeId[];

/** The default insert box for a shape, placed at (100, 100). */
export function defaultBox(def: ShapeDef): Box {
  return { left: 100, top: 100, right: 100 + def.defaultSize.w, bottom: 100 + def.defaultSize.h };
}

export function inside(poly: { x: number; y: number }[], p: { x: number; y: number }): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      c = !c;
    }
  }
  return c;
}
