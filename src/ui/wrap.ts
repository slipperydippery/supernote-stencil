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

/** Extends only the top and the sides, leaving the bottom edge where it is. */
function growTopOnly(b: Box, extra: { x: number; top: number }): Box {
  return { left: b.left - extra.x, top: b.top - extra.top, right: b.right + extra.x, bottom: b.bottom };
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
      // The outline tapers to a point at the top (apex at (0.5, 0), base at y = 1),
      // so symmetric growth can never contain the padded box: at any height above
      // the base the triangle is narrower than the full box, and a box centred on
      // the selection puts half the selection's height above its own centre. Instead
      // the selection sits flush with the base (full width there) and only the top
      // is extended, giving the apex room to taper above it. With top growth equal
      // to the padded height and 60% horizontal growth, the inscribed-width check
      // (k / (1 + 2k) >= 0.5 / (1 + m), i.e. 0.273 >= 0.25) holds with margin;
      // __tests__/wrap.test.ts checks containment against the real outline.
      return growTopOnly(padded, { x: width(padded) * 0.6, top: height(padded) });
    case 'hexagon':
      // Exact inset is HEX_INSET = 30 / 172 ≈ 0.1744 (src/shapes/basic.ts); the
      // required growth is HEX_INSET / (1 - 2 * HEX_INSET) ≈ 0.2679. 0.27 clears
      // it with a small margin instead of landing exactly on the slanted edge.
      return grow(padded, { x: width(padded) * 0.27, y: 0 });
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
