import type { Box, ShapeDef } from '../shapes';

/** Manta px; the caller scales by ctx.unit. */
export const WRAP_PADDING = 24;

function grow(b: Box, delta: { x: number; y: number }): Box {
  return { left: b.left - delta.x, top: b.top - delta.y, right: b.right + delta.x, bottom: b.bottom + delta.y };
}

function width(b: Box): number {
  return b.right - b.left;
}

function height(b: Box): number {
  return b.bottom - b.top;
}

function centredSquare(b: Box, side: number): Box {
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  return { left: cx - side / 2, top: cy - side / 2, right: cx + side / 2, bottom: cy + side / 2 };
}

/**
 * Grows the padded selection so the shape's inscribed area contains it. The
 * factors are geometric (inscribed-rect ratios of each outline), not
 * aesthetic, and tests pin them.
 */
export function wrapBox(def: ShapeDef, selection: Box, padding: number): Box {
  const padded = grow(selection, { x: padding, y: padding });
  switch (def.id) {
    case 'diamond':
    case 'decision':
      return grow(padded, { x: width(padded) * 0.5, y: height(padded) * 0.5 });
    case 'circle':
    case 'ellipse':
      return grow(padded, { x: width(padded) * 0.21, y: height(padded) * 0.21 });
    case 'square': {
      const side = Math.max(width(padded), height(padded));
      return centredSquare(padded, side);
    }
    case 'triangle':
      return grow(padded, { x: width(padded) * 0.35, y: height(padded) * 0.6 });
    case 'hexagon':
      return grow(padded, { x: width(padded) * 0.25, y: 0 });
    default:
      return padded;
  }
}

export function union(a: Box, b: Box): Box {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}
