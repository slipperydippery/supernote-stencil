/**
 * Turns a shape, a box and a style into the strokes and geometry elements that
 * draw it. Pure and deterministic: equal arguments give an equal plan, which is
 * what lets a recipe regenerate a shape.
 */
import type { Box, Pt, ShapeDef, ShapeId } from '../shapes/types';
import { dashSamples } from './dashes';
import { fillStrokes, headStrokes } from './fills';
import { handDrawnOutline, LOCKED, peakThickness, pressureFromWidth, resample, splitStrokes, toXY } from './hand';
import { firmwareWidth, TONE_GAP, WEIGHT_WIDTH, type Style } from './style';

export type StrokeSpec = { points: Pt[]; pressures: number[]; penType: 10 | 16; penColor: 0 | 157 | 201 | 254; thickness: number };
export type GeoSpec = {
  type: 'GEO_polygon' | 'GEO_ellipse' | 'straightLine'; points: Pt[];
  ellipseCenterPoint: Pt | null; ellipseMajorAxisRadius: number; ellipseMinorAxisRadius: number; ellipseAngle: number;
  penType: 10; penColor: 0 | 157 | 201 | 254; penWidth: number;
};
export type Plan = { strokes: StrokeSpec[]; geometries: GeoSpec[]; bounds: Box };

const PRESSURE = 2000;
const STEP = 4;
const ELLIPSES: ReadonlySet<ShapeId> = new Set(['circle', 'ellipse']);

/**
 * Seed for one part of a shape (part 0 = first outline, 1.. = arrow heads,
 * FILL_PART = fill), so parts do not repeat each other's random sequence.
 * Part 0 keeps the recipe seed, matching the spike.
 */
const FILL_PART = 101;
function partSeed(seed: number, part: number): number {
  return seed + part * 1013;
}

function geo(type: GeoSpec['type'], points: Pt[], width: number): GeoSpec {
  return {
    type, points,
    ellipseCenterPoint: null, ellipseMajorAxisRadius: 0, ellipseMinorAxisRadius: 0, ellipseAngle: 0,
    penType: 10, penColor: 0, penWidth: firmwareWidth(width),
  };
}

function cleanGeometries(def: ShapeDef, box: Box, outlines: Pt[][], width: number): GeoSpec[] {
  if (ELLIPSES.has(def.id)) {
    const rx = (box.right - box.left) / 2;
    const ry = (box.bottom - box.top) / 2;
    return [{
      ...geo('GEO_ellipse', outlines[0], width),
      ellipseCenterPoint: { x: box.left + rx, y: box.top + ry },
      ellipseMajorAxisRadius: rx,
      ellipseMinorAxisRadius: ry,
    }];
  }
  if (def.closed) {
    return [geo('GEO_polygon', outlines[0], width)];
  }
  // Open shapes: the shaft keeps all its sampled points as a straightLine; heads are closed into polygons.
  return outlines.map((pl, i) => (i === 0 ? geo('straightLine', pl, width) : geo('GEO_polygon', [...pl, pl[0]], width)));
}

/** The first outline as dashes or dots; heads are not dashed (GH-43) and stay geometries, see cleanGeometries. */
function cleanDashed(def: ShapeDef, outline: Pt[], style: Style, width: number): StrokeSpec[] {
  const out: StrokeSpec[] = [];
  // Split at corners first so no dash bends around one.
  const runs = splitStrokes(toXY(outline), def.closed);
  runs.forEach((run, i) => {
    const samples = resample(run, STEP).map(([x, y]) => ({ x, y }));
    const openEnd = !def.closed && i === runs.length - 1;
    for (const piece of dashSamples(samples, style.line, width, openEnd)) {
      out.push({ points: piece, pressures: piece.map(() => PRESSURE), penType: 10, penColor: 0, thickness: firmwareWidth(width) });
    }
  });
  return out;
}

function handStrokes(def: ShapeDef, outlines: Pt[][], style: Style, width: number, seed: number): StrokeSpec[] {
  const peak = peakThickness(width, LOCKED.swing);
  const out: StrokeSpec[] = [];
  outlines.forEach((outline, i) => {
    const pens = handDrawnOutline(toXY(outline), def.closed, partSeed(seed, i), width);
    // A head reads the same on every arrow: only the shaft (part 0) takes the dash pattern (GH-43).
    const line = i === 0 ? style.line : 'solid';
    pens.forEach((pen, j) => {
      const openEnd = !def.closed && j === pens.length - 1;
      for (const s of dashSamples(pen, line, width, openEnd)) {
        out.push({
          points: s.map(p => ({ x: p.x, y: p.y })),
          pressures: s.map(p => pressureFromWidth(p.w, peak)),
          penType: 16,
          penColor: 0,
          thickness: firmwareWidth(peak),
        });
      }
    });
  });
  return out;
}

function boundsOf(box: Box, strokes: StrokeSpec[], geometries: GeoSpec[]): Box {
  const b = { ...box };
  const add = (p: Pt) => {
    b.left = Math.min(b.left, p.x);
    b.top = Math.min(b.top, p.y);
    b.right = Math.max(b.right, p.x);
    b.bottom = Math.max(b.bottom, p.y);
  };
  for (const s of strokes) {
    s.points.forEach(add);
  }
  for (const g of geometries) {
    g.points.forEach(add);
  }
  return b;
}

/** `gap` is the hatch spacing in page px; it defaults to the tone's built-in value. */
export function renderShape(def: ShapeDef, box: Box, style: Style, seed: number, gap = TONE_GAP[style.tone]): Plan {
  const outlines = def.outline(box);
  const width = WEIGHT_WIDTH[style.weight];
  const strokes: StrokeSpec[] = [];
  const geometries: GeoSpec[] = [];

  if (def.closed && style.fill !== 'none') {
    strokes.push(...fillStrokes(outlines[0], style, width, partSeed(seed, FILL_PART), gap));
  }
  if (!def.closed) {
    for (const h of outlines.slice(1)) {
      strokes.push(...headStrokes([...h, h[0]]));
    }
  }
  if (style.look === 'clean') {
    if (style.line === 'solid') {
      geometries.push(...cleanGeometries(def, box, outlines, width));
    } else {
      strokes.push(...cleanDashed(def, outlines[0], style, width));
      geometries.push(...cleanGeometries(def, box, outlines, width).slice(1));
    }
  } else {
    strokes.push(...handStrokes(def, outlines, style, width, seed));
  }
  return { strokes, geometries, bounds: boundsOf(box, strokes, geometries) };
}
