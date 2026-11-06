import { ARROW } from './arrow';
import { BASIC } from './basic';
import { FLOW } from './flow';
import type { Family, ShapeDef, ShapeId } from './types';

export type { Box, Family, Pt, ShapeDef, ShapeId } from './types';

export const FAMILIES: Family[] = ['basic', 'flow', 'arrow'];

const ORDERED: ShapeDef[] = [...BASIC, ...FLOW, ...ARROW];

export const SHAPES = Object.fromEntries(ORDERED.map(d => [d.id, d])) as Record<ShapeId, ShapeDef>;

export function shapesIn(family: Family): ShapeDef[] {
  return ORDERED.filter(d => d.family === family);
}
