import { ARROW } from './arrow';
import { BASIC } from './basic';
import { FLOW } from './flow';
import type { Family, ShapeDef, ShapeId } from './types';

export type { Box, Family, Pt, ShapeDef, ShapeId } from './types';

export const FAMILIES: Family[] = ['basic', 'flow', 'arrow'];

const ORDERED: ShapeDef[] = [...BASIC, ...FLOW, ...ARROW];

export const SHAPES = Object.fromEntries(ORDERED.map(d => [d.id, d])) as Record<ShapeId, ShapeDef>;

/** Shape ids that no longer exist, mapped to the shape that now draws them (GH-45: arrowDown is an arrow on a zero-width box). */
const LEGACY: Readonly<Record<string, ShapeId>> = { arrowDown: 'arrow' };

/** A stored shape id, upgraded from a legacy id; null when it names no shape. */
export function readShapeId(raw: unknown): ShapeId | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const id = Object.prototype.hasOwnProperty.call(LEGACY, raw) ? LEGACY[raw] : raw;
  return Object.prototype.hasOwnProperty.call(SHAPES, id) ? (id as ShapeId) : null;
}

export function shapesIn(family: Family): ShapeDef[] {
  return ORDERED.filter(d => d.family === family);
}
