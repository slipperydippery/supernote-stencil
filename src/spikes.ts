/**
 * On-device checks that gate the Stencil build. Each inserts something into the
 * current page and returns what to look for.
 */
import { PluginCommAPI, type Point, type Rect } from 'sn-plugin-lib';
import { call } from './sdk';
import { handDrawnOutline, LOCKED, peakThickness, pressureFromWidth, toPoints, type Pt } from './handdrawn';
import { constant, insertStrokes, PEN, ramp, sampleLine, type PageCtx, type StrokeSpec } from './strokes';
import type { GeoSpec, Recipe } from './device/contracts';
import { insertPlan, readLasso } from './device';

export type SpikeResult = { rect: Rect; log: string };

const MID = 2000;

function rectOutline(cx: number, cy: number, w: number, h: number): Pt[] {
  const l = cx - w / 2,
    t = cy - h / 2,
    r = cx + w / 2,
    b = cy + h / 2;
  return [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
    [l, t],
  ];
}

function sides(outline: Pt[], penType: number, pressure: number, metadata: boolean): StrokeSpec[] {
  const specs: StrokeSpec[] = [];
  for (let i = 1; i < outline.length; i++) {
    const pts = sampleLine({ x: outline[i - 1][0], y: outline[i - 1][1] }, { x: outline[i][0], y: outline[i][1] });
    specs.push({ points: pts, pressures: constant(pressure, pts.length), penType, metadata });
  }
  return specs;
}

/** 1. Minimal synthetic stroke: a 480 x 240 box at page centre, points and pressures only. */
export async function plainRect(ctx: PageCtx, metadata: boolean): Promise<SpikeResult> {
  const u = ctx.unit;
  const outline = rectOutline(ctx.width / 2, ctx.height / 2, 480 * u, 240 * u);
  const rect = await insertStrokes(ctx, sides(outline, PEN.technical, MID, metadata));
  return {
    rect,
    log:
      `Plain rect${metadata ? ' + metadata' : ''} inserted at page centre, pen 10, pressure ${MID}.\n` +
      'Look for: four crisp sides, even width, no gaps at corners.\n' +
      'Then lasso it and try to stretch it non-proportionally (stretch check), and try undo.',
  };
}

/** 2. Pressure ladder: three constant pressures and one ramp, for each pen type. */
export async function pressureLadder(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const x0 = 200 * u,
    x1 = 1100 * u;
  const gap = 44 * u;
  let y = 200 * u;
  const specs: StrokeSpec[] = [];
  const pens: [string, number][] = [
    ['16 pressure', PEN.pressure],
    ['10 technical', PEN.technical],
    ['11 marker', PEN.marker],
    ['15 calligraphy', PEN.calligraphy],
  ];
  const lines: string[] = [];
  let row = 1;
  for (const [name, penType] of pens) {
    for (const p of [800, 2000, 3600]) {
      const pts = sampleLine({ x: x0, y }, { x: x1, y });
      specs.push({ points: pts, pressures: constant(p, pts.length), penType });
      lines.push(`row ${row++}: pen ${name}, pressure ${p}`);
      y += gap;
    }
    const pts = sampleLine({ x: x0, y }, { x: x1, y });
    specs.push({ points: pts, pressures: ramp(300, 4000, pts.length), penType });
    lines.push(`row ${row++}: pen ${name}, ramp 300 to 4000`);
    y += gap * 1.8;
  }
  const rect = await insertStrokes(ctx, specs);
  return {
    rect,
    log:
      'Pressure ladder inserted top-left, 16 rows in 4 groups:\n' +
      lines.join('\n') +
      '\nLook for: which pen type changes width with pressure, and whether the ramp row thickens smoothly.',
  };
}

/** 3. Hand-drawn box with the locked constants, on the pressure pen and the technical pen. */
export async function handDrawnRect(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const base = ctx.penInfo?.width ?? 600;
  const specs: StrokeSpec[] = [];
  const boxes: [number, number][] = [
    [ctx.height / 2 - 170 * u, PEN.pressure],
    [ctx.height / 2 + 170 * u, PEN.technical],
  ];
  const peak = peakThickness(base, LOCKED.swing);
  boxes.forEach(([cy, penType], i) => {
    const outline = rectOutline(ctx.width / 2, cy, 480 * u, 240 * u);
    for (const stroke of handDrawnOutline(outline, true, 7 + i, base)) {
      specs.push({
        points: toPoints(stroke),
        pressures: stroke.map(s => pressureFromWidth(s.w, peak)),
        penType,
        thickness: penType === PEN.pressure ? peak : base,
        userData: JSON.stringify(handRecipe(7 + i)),
      });
    }
  });
  const rect = await insertStrokes(ctx, specs);
  return {
    rect,
    log:
      `Two hand-drawn boxes at page centre: upper on pen 16 at thickness ${Math.round(peak)} with pressure profile, lower on pen 10 at ${base} constant. ${specs.length} strokes.\n` +
      'Look for: the upper box should look as dark as the lower on average, with visible thin-thick variation.\n' +
      'If both boxes look identical, pressure is ignored by both pens.',
  };
}

/** 4. Gaps inside one stroke: flagDraw false, pressure 0, and separate dashes as reference. */
export async function dashGap(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const x0 = 200 * u,
    x1 = 1100 * u;
  let y = ctx.height - 500 * u;
  const gap = 60 * u;
  const specs: StrokeSpec[] = [];

  const a = sampleLine({ x: x0, y }, { x: x1, y });
  const third = (i: number) => i > a.length / 3 && i < (2 * a.length) / 3;
  specs.push({
    points: a,
    pressures: constant(MID, a.length),
    penType: PEN.technical,
    flagDraw: a.map((_, i) => !third(i)),
  });
  y += gap;

  const b = sampleLine({ x: x0, y }, { x: x1, y });
  specs.push({
    points: b,
    pressures: b.map((_, i) => (third(i) ? 0 : MID)),
    penType: PEN.pressure,
  });
  y += gap;

  const on = 40 * u,
    off = 26 * u;
  for (let x = x0; x < x1; x += on + off) {
    const pts = sampleLine({ x, y }, { x: Math.min(x1, x + on), y });
    specs.push({ points: pts, pressures: constant(MID, pts.length), penType: PEN.technical });
  }

  const rect = await insertStrokes(ctx, specs);
  return {
    rect,
    log:
      'Dash test inserted bottom-left, three rows:\n' +
      'row 1: one stroke, flagDraw false in the middle third (ignored since GH-3, renders solid)\n' +
      'row 2: one stroke on pen 16, pressure 0 in the middle third\n' +
      'row 3: separate dash strokes (reference)\n' +
      'Look for: does row 1 or 2 show a gap? Then lasso row 3 and see whether all dashes select together.',
  };
}

/** 2b. Fine pressure sweep on the pressure pen: 400 to 3600 in steps of 400. */
export async function pressureSweep(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const x0 = 200 * u,
    x1 = 1100 * u;
  let y = 200 * u;
  const specs: StrokeSpec[] = [];
  const rows: string[] = [];
  for (let p = 400; p <= 3600; p += 400) {
    const pts = sampleLine({ x: x0, y }, { x: x1, y });
    specs.push({ points: pts, pressures: constant(p, pts.length), penType: PEN.pressure });
    rows.push(String(p));
    y += 44 * u;
  }
  const rect = await insertStrokes(ctx, specs);
  return {
    rect,
    log:
      `Pressure sweep on pen 16, ${rows.length} rows top-left, pressures ${rows.join(', ')}.\n` +
      'Look for: between which rows the width still grows. That range is where the hand-drawn swing should live.',
  };
}

/** 6. Thickness ladder: what does the element thickness value mean on the page? */
export async function thicknessLadder(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const x0 = 200 * u,
    x1 = 1100 * u;
  let y = ctx.height / 2;
  const specs: StrokeSpec[] = [];
  const rows: string[] = [];
  const pen = ctx.penInfo?.width ?? 600;
  const values: [string, number][] = [
    ['pen width × 0.5', pen * 0.5],
    ['pen width × 1', pen],
    ['pen width × 2', pen * 2],
    ['pen width × 4', pen * 4],
    ['200 (0.1 mm)', 200],
    ['600 (0.5 mm)', 600],
    ['1200 (1.0 mm)', 1200],
    ['2400 (2.0 mm)', 2400],
  ];
  for (const [label, t] of values) {
    const pts = sampleLine({ x: x0, y }, { x: x1, y });
    specs.push({ points: pts, pressures: constant(MID, pts.length), penType: PEN.technical, thickness: t });
    rows.push(`${label} = ${+t.toFixed(2)}`);
    y += 44 * u;
  }
  const rect = await insertStrokes(ctx, specs);
  return {
    rect,
    log:
      `Thickness ladder on pen 10 from mid-page, 8 rows:\n${rows.join('\n')}\n` +
      'Look for: which rows differ. If none do, thickness is ignored and width comes from the pen type and pressure only.',
  };
}

/** 7. Geometry elements: a polygon box and an ellipse via insertGeometry, lasso shown after insert. */
export async function geometryShapes(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const cx = ctx.width / 2;
  const w = 480 * u,
    h = 240 * u;
  const top = ctx.height / 2 - 170 * u;
  const box = {
    showLassoAfterInsert: true,
    penColor: 0,
    penType: PEN.technical,
    penWidth: 200,
    type: 'GEO_polygon',
    points: [
      { x: cx - w / 2, y: top - h / 2 },
      { x: cx + w / 2, y: top - h / 2 },
      { x: cx + w / 2, y: top + h / 2 },
      { x: cx - w / 2, y: top + h / 2 },
      { x: cx - w / 2, y: top - h / 2 },
    ],
    ellipseCenterPoint: null,
    ellipseMajorAxisRadius: 0,
    ellipseMinorAxisRadius: 0,
    ellipseAngle: 0,
  };
  const ellipse = {
    showLassoAfterInsert: false,
    penColor: 0,
    penType: PEN.technical,
    penWidth: 200,
    type: 'GEO_ellipse',
    points: [],
    ellipseCenterPoint: { x: cx, y: ctx.height / 2 + 170 * u },
    ellipseMajorAxisRadius: w / 2,
    ellipseMinorAxisRadius: h / 2,
    ellipseAngle: 0,
  };
  await call('insertGeometry ellipse', PluginCommAPI.insertGeometry(ellipse));
  await call('insertGeometry box', PluginCommAPI.insertGeometry(box));
  return {
    rect: { left: cx - w / 2, top: top - h / 2, right: cx + w / 2, bottom: top + h / 2 },
    log:
      'Two geometry elements at page centre: a polygon box (upper, lasso requested after insert) and an ellipse (lower). penWidth 200.\n' +
      'Look for: is the box selected when the plugin closes? Lasso each and try to stretch non-proportionally and rotate. Compare line weight with the pen 10 strokes.',
  };
}

/**
 * 8. Hand-drawn box as ONE geometry polygon: the bowed, overshooting pen
 * strokes are chained into a single polyline. Constant width (no pressure on
 * geometry), but one element that the native lasso can stretch and undo.
 */
export async function handDrawnGeometry(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const base = ctx.penInfo?.width ?? 600;
  const outline = rectOutline(ctx.width / 2, ctx.height / 2, 480 * u, 240 * u);
  const strokes = handDrawnOutline(outline, true, 11, base);
  const points: Point[] = [];
  for (const st of strokes) {
    for (let i = 0; i < st.length; i += 2) {
      points.push({ x: Math.round(st[i].x), y: Math.round(st[i].y) });
    }
  }
  const geometry = {
    showLassoAfterInsert: true,
    penColor: 0,
    penType: PEN.technical,
    penWidth: Math.round(base),
    type: 'GEO_polygon',
    points,
    ellipseCenterPoint: null,
    ellipseMajorAxisRadius: 0,
    ellipseMinorAxisRadius: 0,
    ellipseAngle: 0,
  };
  await call('insertGeometry hand-drawn', PluginCommAPI.insertGeometry(geometry));
  const xs = points.map(p => p.x),
    ys = points.map(p => p.y);
  return {
    rect: { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) },
    log:
      `Hand-drawn box as one polygon geometry, ${points.length} points, pen 10, width ${Math.round(base)}.\n` +
      'Look for: bows and corner overshoots present? Then stretch it with the lasso: do the bows scale sensibly? Compare the look with button 3.',
  };
}

function handRecipe(seed: number): Recipe {
  return { v: 1, shape: 'rectangle', style: { weight: 'normal', line: 'solid', fill: 'none', look: 'hand' }, seed };
}

/**
 * 7g. Geometry through page elements: the same box and ellipse as check 7, but
 * inserted with insertPlan so each carries a recipe in userData.
 */
export async function geometryPageElements(ctx: PageCtx): Promise<SpikeResult> {
  const u = ctx.unit;
  const cx = ctx.width / 2;
  const w = 480 * u,
    h = 240 * u;
  const top = ctx.height / 2 - 170 * u;
  const bottom = ctx.height / 2 + 170 * u;
  const geo = (g: Partial<GeoSpec>): GeoSpec => ({
    type: 'GEO_polygon',
    points: [],
    ellipseCenterPoint: null,
    ellipseMajorAxisRadius: 0,
    ellipseMinorAxisRadius: 0,
    ellipseAngle: 0,
    penType: 10,
    penColor: 0,
    penWidth: 600.001,
    ...g,
  });
  const clean = { weight: 'normal', line: 'solid', fill: 'none', look: 'clean' } as const;
  const boxRect = { left: cx - w / 2, top: top - h / 2, right: cx + w / 2, bottom: top + h / 2 };
  const ellRect = { left: cx - w / 2, top: bottom - h / 2, right: cx + w / 2, bottom: bottom + h / 2 };
  const box = geo({
    points: [
      { x: boxRect.left, y: boxRect.top },
      { x: boxRect.right, y: boxRect.top },
      { x: boxRect.right, y: boxRect.bottom },
      { x: boxRect.left, y: boxRect.bottom },
      { x: boxRect.left, y: boxRect.top },
    ],
  });
  const ellipse = geo({
    type: 'GEO_ellipse',
    ellipseCenterPoint: { x: cx, y: bottom },
    ellipseMajorAxisRadius: w / 2,
    ellipseMinorAxisRadius: h / 2,
  });
  await insertPlan(ctx, { strokes: [], geometries: [box], bounds: boxRect }, { v: 1, shape: 'rectangle', style: clean, seed: 1 });
  await insertPlan(ctx, { strokes: [], geometries: [ellipse], bounds: ellRect }, { v: 1, shape: 'ellipse', style: clean, seed: 1 });
  return {
    rect: { left: boxRect.left, top: boxRect.top, right: ellRect.right, bottom: ellRect.bottom },
    log:
      'Geometry via page elements: a polygon box (upper) and an ellipse (lower), each tagged with a recipe, penWidth 600.\n' +
      'Look for: both render. Lasso each and stretch it non-proportionally, and check the lasso toolbar shows "Stencil redraw".\n' +
      'If the polygon does not render, stop and report: the clean-look carrier depends on it.',
  };
}

/** Hand-drawn box rendered to fit `rect` exactly, tagged with its recipe. */
export async function handDrawnBoxAt(ctx: PageCtx, rect: Rect, seed: number): Promise<Rect> {
  const base = ctx.penInfo?.width ?? 600;
  const peak = peakThickness(base, LOCKED.swing);
  const recipe = handRecipe(seed);
  const cx = (rect.left + rect.right) / 2,
    cy = (rect.top + rect.bottom) / 2;
  const outline = rectOutline(cx, cy, rect.right - rect.left, rect.bottom - rect.top);
  const specs: StrokeSpec[] = handDrawnOutline(outline, true, seed, base).map(stroke => ({
    points: toPoints(stroke),
    pressures: stroke.map(s => pressureFromWidth(s.w, peak)),
    penType: PEN.pressure,
    thickness: peak,
    userData: JSON.stringify(recipe),
  }));
  return insertStrokes(ctx, specs);
}

/**
 * Redraw: read the recipe from the lassoed elements, take the lasso box,
 * delete the selection and render the shape fresh into that box.
 */
export async function redrawLasso(ctx: PageCtx): Promise<SpikeResult> {
  const { rect: box, recipe, count } = await readLasso();
  if (!recipe) {
    return { rect: box, log: `Redraw: ${count} lassoed elements, none carries a valid Stencil recipe. Nothing changed.` };
  }
  await call('deleteLassoElements', PluginCommAPI.deleteLassoElements());
  const pad = 6;
  const target = { left: box.left + pad, top: box.top + pad, right: box.right - pad, bottom: box.bottom - pad };
  const rect = await handDrawnBoxAt(ctx, target, recipe.seed + 1);
  return {
    rect,
    log:
      `Redraw: ${count} elements, recipe ${recipe.shape} seed ${recipe.seed}.\n` +
      `Lasso box ${Math.round(box.left)},${Math.round(box.top)} to ${Math.round(box.right)},${Math.round(box.bottom)}; deleted and redrawn into it.`,
  };
}

export function describePoint(p: Point): string {
  return `${Math.round(p.x)},${Math.round(p.y)}`;
}
