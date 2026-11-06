import { Element, PluginCommAPI } from 'sn-plugin-lib';
import type { Box, Plan, Recipe } from './contracts';
import type { PageCtx } from './page';
import { parseRecipeLocal } from './recipe';
import { call, recycle } from './sdk';

/** Integer widths render as hairlines (finding "thickness unit"), so always carry a fraction. */
function fractional(w: number): number {
  return Number.isInteger(w) ? w + 0.001 : w;
}

/**
 * Inserts through the page-element API, which redraws by itself. Never save
 * and reload around it: a reload was seen to drop freshly written strokes.
 * Stroke metadata (contours, angles, recognition points, flagDraw) is never
 * written; it breaks lasso hit-testing.
 */
export async function insertTagged(ctx: PageCtx, plan: Plan, tag: string): Promise<Box> {
  const created: Element[] = [];
  try {
    for (const s of plan.strokes) {
      const el = await call<Element>('createElement', PluginCommAPI.createElement(Element.TYPE_STROKE));
      created.push(el);
      el.pageNum = ctx.page;
      el.layerNum = 0;
      el.thickness = fractional(s.thickness);
      el.userData = tag;
      el.stroke!.penType = s.penType;
      el.stroke!.penColor = s.penColor;
      if (s.points.length > 0) {
        await el.stroke!.points.setRange(0, s.points.length - 1, s.points as any);
      }
      if (s.pressures.length > 0) {
        await el.stroke!.pressures.setRange(0, s.pressures.length - 1, s.pressures as any);
      }
    }
    for (const g of plan.geometries) {
      const el = await call<Element>('createElement', PluginCommAPI.createElement(Element.TYPE_GEO));
      created.push(el);
      el.pageNum = ctx.page;
      el.layerNum = 0;
      el.thickness = fractional(g.penWidth);
      el.userData = tag;
      el.geometry = {
        ...el.geometry,
        showLassoAfterInsert: false,
        penColor: g.penColor,
        penType: g.penType,
        penWidth: fractional(g.penWidth),
        type: g.type,
        points: g.points,
        ellipseCenterPoint: g.ellipseCenterPoint,
        ellipseMajorAxisRadius: g.ellipseMajorAxisRadius,
        ellipseMinorAxisRadius: g.ellipseMinorAxisRadius,
        ellipseAngle: g.ellipseAngle,
      } as any;
    }
    await call('insertPageElements', PluginCommAPI.insertPageElements(created, ctx.page));
  } finally {
    created.forEach(recycle);
  }
  return plan.bounds;
}

/** Every element carries the recipe, so any one of them identifies the shape for redraw. */
export function insertPlan(ctx: PageCtx, plan: Plan, recipe: Recipe): Promise<Box> {
  // Same bytes as PR 1's serializeRecipe as long as the recipe was built with keys v, shape, style, seed.
  const tag = JSON.stringify({ v: recipe.v, shape: recipe.shape, style: recipe.style, seed: recipe.seed });
  return insertTagged(ctx, plan, tag);
}

/** `rect` is the visual lasso box, inflated by half the stroke width; callers shrink it. */
export async function readLasso(): Promise<{ rect: Box; recipe: Recipe | null; count: number }> {
  // The cache can hand out stale elements right after a native move or resize.
  PluginCommAPI.clearElementCache();
  const elements = (await call<any[] | null>('getLassoElements', PluginCommAPI.getLassoElements())) ?? [];
  try {
    const rect = await call<Box>('getLassoRect', PluginCommAPI.getLassoRect());
    let recipe: Recipe | null = null;
    for (const e of elements) {
      recipe = parseRecipeLocal(e?.userData);
      if (recipe) {
        break;
      }
    }
    return { rect, recipe, count: elements.length };
  } finally {
    elements.forEach(recycle);
  }
}

export async function replaceLasso(ctx: PageCtx, plan: Plan, recipe: Recipe): Promise<Box> {
  await call('deleteLassoElements', PluginCommAPI.deleteLassoElements());
  return insertPlan(ctx, plan, recipe);
}
