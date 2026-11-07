import { Element, PluginCommAPI, PluginFileAPI, PluginManager } from 'sn-plugin-lib';
import type { Plan } from '../render/plan';
import { parseRecipe, serializeRecipe, type Recipe } from '../render/recipe';
import { noteKey, type LastPlacement } from './lastPlacement';
import type { Box } from '../shapes';
import { currentPage, type PageCtx } from './page';
import { dropLasso, showView } from './lasso';
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
async function insertTagged(ctx: PageCtx, plan: Plan, tag: string): Promise<Box> {
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
  return insertTagged(ctx, plan, serializeRecipe(recipe));
}

export type LassoSelection = {
  rect: Box;
  liveRect: Box;
  recipe: Recipe | null;
  count: number;
  /** Elements of the recipe's shape. */
  recipes: number;
  /** Distinct Stencil shapes in the selection. */
  shapes: number;
  /**
   * The one shape's elements and the bounds of their points, when they differ from the selection:
   * other elements were selected with it, or only part of it was. `tag` is set in the second case.
   */
  own: { nums: number[]; box: Box; tag?: string } | null;
};

/** Bounds of the elements' centrelines, not inflated by stroke width. */
async function pointBounds(elements: any[]): Promise<Box | null> {
  const b = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const add = (p: { x: number; y: number }) => {
    b.left = Math.min(b.left, p.x);
    b.top = Math.min(b.top, p.y);
    b.right = Math.max(b.right, p.x);
    b.bottom = Math.max(b.bottom, p.y);
  };
  for (const e of elements) {
    const points = e?.stroke?.points;
    if (points) {
      const n = await points.size();
      if (n > 0) {
        (await points.getRange(0, n)).forEach(add);
      }
    }
    e?.geometry?.points?.forEach(add);
  }
  return Number.isFinite(b.left) ? b : null;
}

/**
 * The page's elements carrying `tag`, but only when the page read agrees with the lasso: every
 * lassoed element of the shape must be among them under the same number. Inserts reach the page
 * read only once the note is saved, so a fresh shape fails this, and a stale numbering must never
 * drive a delete.
 */
async function pageGroup(tag: string, lassoed: number[]): Promise<{ nums: number[]; box: Box; tag: string } | null> {
  const { notePath, page } = await currentPage();
  const elements = (await call<any[] | null>('getElements', PluginFileAPI.getElements(page, notePath))) ?? [];
  try {
    const group = elements.filter(e => e?.userData === tag);
    const nums = group.map(e => e.numInPage);
    if (!lassoed.every(n => nums.includes(n))) {
      return null;
    }
    const box = await pointBounds(group);
    return box ? { nums, box, tag } : null;
  } finally {
    elements.forEach(recycle);
  }
}

/**
 * `rect` is the visual lasso box, inflated by half the stroke width; callers shrink it.
 * `liveRect` is the current selection box even while a native stretch is pending (`getLassoRect`
 * keeps returning the pre-resize box until the selection is dropped and made again); it falls
 * back to `rect` when `generateLassoPreview` is unavailable or fails.
 *
 * Elements of one placement share one `userData` string; its random seed keeps two placements apart.
 */
export async function readLasso(): Promise<LassoSelection> {
  // The cache can hand out stale elements right after a native move or resize.
  PluginCommAPI.clearElementCache();
  const elements = (await call<any[] | null>('getLassoElements', PluginCommAPI.getLassoElements())) ?? [];
  try {
    const rect = await call<Box>('getLassoRect', PluginCommAPI.getLassoRect());
    const groups = new Map<string, any[]>();
    for (const e of elements) {
      if (parseRecipe(e?.userData)) {
        groups.set(e.userData, [...(groups.get(e.userData) ?? []), e]);
      }
    }
    const [tag, group = []]: [string?, any[]?] = groups.entries().next().value ?? [];
    const recipe = parseRecipe(tag);
    let own: LassoSelection['own'] = null;
    const nums: number[] = group.map(e => e.numInPage);
    if (groups.size === 1 && nums.every(n => Number.isInteger(n))) {
      const whole = await pageGroup(tag!, nums).catch(e => {
        console.warn('page read failed; redrawing the selection only', e);
        return null;
      });
      if (whole && whole.nums.length > nums.length) {
        own = whole;
      } else if (group.length < elements.length) {
        const box = await pointBounds(group);
        own = box ? { nums, box } : null;
      }
    }
    let liveRect = rect;
    try {
      const dir = await PluginManager.getPluginDirPath();
      if (dir) {
        const preview = await call<{ rect: Box }>('generateLassoPreview', PluginCommAPI.generateLassoPreview(`${dir}/lasso-preview.png`));
        liveRect = preview.rect;
      }
    } catch {
      // generateLassoPreview unavailable or failed; rect from getLassoRect is the best we have.
    }
    return { rect, liveRect, recipe, count: elements.length, recipes: group.length, shapes: groups.size, own };
  } finally {
    elements.forEach(recycle);
  }
}

export async function replaceLasso(ctx: PageCtx, plan: Plan, recipe: Recipe): Promise<Box> {
  await call('deleteLassoElements', PluginCommAPI.deleteLassoElements());
  return insertPlan(ctx, plan, recipe);
}

/** Replaces only the listed elements; the rest of the selection stays on the page as it was. */
export async function replaceElements(ctx: PageCtx, nums: number[], plan: Plan, recipe: Recipe): Promise<Box> {
  await call('deletePageElements', PluginCommAPI.deletePageElements(nums, ctx.page));
  return insertPlan(ctx, plan, recipe);
}

/** Grows the shape's centreline bounds by stroke width and overshoot, so the lasso catches all of it. */
const WHOLE_PAD = 16;

/**
 * Deleting an element outside the lasso unbinds the note (the next call fails with 105 and the
 * note is closed), so the whole shape is lassoed first and only what that lasso holds is deleted.
 * lassoElements needs the plugin view closed. Throws, changing nothing, unless the lasso holds
 * exactly the `expected` elements satisfying `ours`.
 */
async function deleteLassoed(ctx: PageCtx, box: Box, ours: (e: any) => boolean, expected: number, mismatch?: () => Promise<void>): Promise<void> {
  await PluginManager.closePluginView();
  await call(
    'lassoElements',
    PluginCommAPI.lassoElements({
      left: Math.floor(box.left - WHOLE_PAD),
      top: Math.floor(box.top - WHOLE_PAD),
      right: Math.ceil(box.right + WHOLE_PAD),
      bottom: Math.ceil(box.bottom + WHOLE_PAD),
    }),
  );
  // lassoElements does not refresh the element cache, which would still hold the previous selection.
  PluginCommAPI.clearElementCache();
  const selected = (await call<any[] | null>('getLassoElements', PluginCommAPI.getLassoElements())) ?? [];
  let nums: number[];
  try {
    nums = selected.filter(ours).map(e => e.numInPage);
  } finally {
    selected.forEach(recycle);
  }
  if (nums.length !== expected) {
    await mismatch?.();
    throw new Error(`the lasso caught ${nums.length} of the shape's ${expected} elements; nothing was changed`);
  }
  if (nums.length === selected.length) {
    await call('deleteLassoElements', PluginCommAPI.deleteLassoElements());
  } else {
    await call('deletePageElements', PluginCommAPI.deletePageElements(nums, ctx.page));
  }
}

/** Removes the whole shape carrying `tag` (see deleteLassoed); the view is closed afterwards. */
export function deleteWhole(ctx: PageCtx, tag: string, expected: number, box: Box): Promise<void> {
  return deleteLassoed(ctx, box, e => e?.userData === tag, expected);
}

export async function replaceWhole(ctx: PageCtx, tag: string, expected: number, box: Box, plan: Plan, recipe: Recipe): Promise<Box> {
  await deleteWhole(ctx, tag, expected, box);
  return insertPlan(ctx, plan, recipe);
}

/** Removes the current selection as it is. */
export async function deleteLasso(): Promise<void> {
  await call('deleteLassoElements', PluginCommAPI.deleteLassoElements());
}

/** Removes only the listed elements of the current selection. */
export async function deleteElements(ctx: PageCtx, nums: number[]): Promise<void> {
  await call('deletePageElements', PluginCommAPI.deletePageElements(nums, ctx.page));
}

/**
 * Removes the shape a placement record describes: its elements are the ones whose recipe carries
 * the recorded seed. The lasso the check needs closes the view, so when the shape is not found
 * as recorded (moved, stretched or already gone) the lasso is dropped and the view reopened
 * before the error reaches the caller.
 */
export function undoPlacement(ctx: PageCtx, record: LastPlacement): Promise<void> {
  if (record.page !== ctx.page || record.note !== noteKey(ctx.notePath)) {
    return Promise.reject(new Error('the last shape was placed on another page; nothing was changed'));
  }
  const ours = (e: any) => parseRecipe(e?.userData)?.seed === record.seed;
  return deleteLassoed(ctx, record.box, ours, record.count, async () => {
    await dropLasso();
    await showView();
  });
}
