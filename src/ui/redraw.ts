import type { Recipe } from '../render/recipe';
import type { Box } from '../shapes';

/** Never produces a box thinner than this, even on a tiny lasso. */
const MIN_SIDE = 24;

/** The lasso rect is the visual box, inflated by about half the stroke width plus join slack. */
export function redrawBox(rect: Box, penWidth: number): Box {
  const inset = Math.max(6, Math.ceil(penWidth / 200) + 4); // 600 → 7 px, 1000 → 9 px; sn-shapes measured 6–17 px at 900
  const cx = (rect.left + rect.right) / 2;
  const cy = (rect.top + rect.bottom) / 2;
  const w = Math.max(rect.right - rect.left - inset * 2, MIN_SIDE);
  const h = Math.max(rect.bottom - rect.top - inset * 2, MIN_SIDE);
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
}

/** The preview box may differ from the lasso rect by rounding, so a pending transform is anything past 2 px. */
export function moved(rect: Box, live: Box): boolean {
  return (['left', 'top', 'right', 'bottom'] as const).some(k => Math.abs(rect[k] - live[k]) > 2);
}

/** Reverses the box to the drag direction a placed arrow recorded, so redraw keeps pointing the same way. */
export function applyFlip(box: Box, flip?: Recipe['flip']): Box {
  if (!flip) {
    return box;
  }
  return {
    left: flip.x ? box.right : box.left,
    right: flip.x ? box.left : box.right,
    top: flip.y ? box.bottom : box.top,
    bottom: flip.y ? box.top : box.bottom,
  };
}
