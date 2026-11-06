import type { PageCtx } from '../device';
import type { Recipe } from '../render/recipe';
import type { Box, Pt, ShapeDef, ShapeId } from '../shapes';

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

/** Arrow-family shapes that read the same whichever way they are drawn. */
const SYMMETRIC: ReadonlySet<ShapeId> = new Set(['line', 'doubleArrow']);

/** Arrow-family shapes whose outline mirrors with a reversed drag (README contract "style and recipe", `flip`). */
const DIRECTIONAL: ReadonlySet<ShapeId> = new Set(['arrow', 'arrowDown', 'elbowArrow', 'curvedArrow']);

/**
 * Set when a directional arrow's drag ran right-to-left or bottom-to-top, so a
 * later redraw into a normalised lasso box can mirror the outline back.
 * Non-directional shapes and an unreversed drag both give `undefined`.
 */
export function flipFor(def: ShapeDef, dragged: Box): Recipe['flip'] {
  if (!DIRECTIONAL.has(def.id)) {
    return undefined;
  }
  const flip: { x?: boolean; y?: boolean } = {};
  if (dragged.left > dragged.right) {
    flip.x = true;
  }
  if (dragged.top > dragged.bottom) {
    flip.y = true;
  }
  return flip.x || flip.y ? flip : undefined;
}

/**
 * `dragged` runs from pen-down (left, top) to pen-up (right, bottom). Arrows
 * keep the exact swept box, with no minimum side, and directional ones run
 * from pen-down to pen-up: a reversed side mirrors the outline. Everything else
 * is normalised, squared for keepAspect and at least MIN_SIDE on each side.
 */
export function fitBox(def: ShapeDef, dragged: Box): Box {
  if (def.family === 'arrow') {
    if (SYMMETRIC.has(def.id)) {
      return normalise(dragged);
    }
    // The curve runs from its frame's (0, 1) to (1, 0), so its vertical axis is swapped to start at pen-down.
    return def.id === 'curvedArrow' ? { ...dragged, top: dragged.bottom, bottom: dragged.top } : { ...dragged };
  }
  const n = normalise(dragged);
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
