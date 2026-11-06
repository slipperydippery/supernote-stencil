import type { PageCtx } from '../device';
import type { Box, Pt, ShapeDef } from '../shapes';

/** Smallest side of a dragged closed shape, page px. */
export const MIN_SIDE = 24;

export function toPagePx(dp: { x: number; y: number }, scale: number): Pt {
  return { x: dp.x * scale, y: dp.y * scale };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** Default size × ctx.unit, centred on the tap point, moved inside the page. */
export function defaultBoxAt(def: ShapeDef, at: Box, ctx: PageCtx): Box {
  const w = def.defaultSize.w * ctx.unit;
  const h = def.defaultSize.h * ctx.unit;
  const left = clamp((at.left + at.right) / 2 - w / 2, 0, ctx.width - w);
  const top = clamp((at.top + at.bottom) / 2 - h / 2, 0, ctx.height - h);
  return { left, top, right: left + w, bottom: top + h };
}

function normalise(b: Box): Box {
  return {
    left: Math.min(b.left, b.right),
    top: Math.min(b.top, b.bottom),
    right: Math.max(b.left, b.right),
    bottom: Math.max(b.top, b.bottom),
  };
}

/** Grows a side shorter than `min` about its centre. */
function atLeast(lo: number, hi: number, min: number): [number, number] {
  if (hi - lo >= min) {
    return [lo, hi];
  }
  const c = (lo + hi) / 2;
  return [c - min / 2, c + min / 2];
}

/**
 * `dragged` runs from pen-down (left, top) to pen-up (right, bottom). Arrows
 * keep the exact swept box and, where the shape has a direction, the drag's
 * direction: a reversed side mirrors the outline. Everything else is
 * normalised, squared for keepAspect and at least MIN_SIDE on each side.
 */
export function fitBox(def: ShapeDef, dragged: Box): Box {
  const n = normalise(dragged);
  if (def.family === 'arrow') {
    if (def.id === 'arrow') {
      return { ...n, left: dragged.left, right: dragged.right };
    }
    if (def.id === 'arrowDown') {
      return { ...n, top: dragged.top, bottom: dragged.bottom };
    }
    return n;
  }
  let { left, top, right, bottom } = n;
  if (def.keepAspect) {
    const side = Math.min(right - left, bottom - top);
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    [left, right] = [cx - side / 2, cx + side / 2];
    [top, bottom] = [cy - side / 2, cy + side / 2];
  }
  [left, right] = atLeast(left, right, MIN_SIDE);
  [top, bottom] = atLeast(top, bottom, MIN_SIDE);
  return { left, top, right, bottom };
}
