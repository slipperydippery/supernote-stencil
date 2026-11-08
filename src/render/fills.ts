/**
 * Fills as pen-10 strokes clipped to the outline polygon: solid fills (and
 * arrow heads, in the ink) as dense horizontal lines in the tone's grey, hatch and
 * cross as 45° lines whose spacing is set by the tone alone.
 */
import type { Box, Pt } from '../shapes/types';
import { handDraw, LOCKED, resample, type XY } from './hand';
import type { StrokeSpec } from './plan';
import { seeded } from './rng';
import { firmwareWidth, HATCH_SHARE, TONE_COLOR, widthPx, type Style } from './style';

const STEP = 4;
const PRESSURE = 2000;

/**
 * Pieces of the line through `a` in direction `d` that lie inside `poly`
 * (even-odd rule), as [start, end] pairs. Half-open sign test so a vertex on
 * the line is counted once.
 */
export function clipLine(poly: Pt[], a: Pt, d: Pt): [Pt, Pt][] {
  const n = { x: -d.y, y: d.x };
  const ts: number[] = [];
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i - 1];
    const q = poly[i];
    const sp = n.x * (p.x - a.x) + n.y * (p.y - a.y);
    const sq = n.x * (q.x - a.x) + n.y * (q.y - a.y);
    if (sp > 0 !== sq > 0) {
      const k = sp / (sp - sq);
      const x = p.x + (q.x - p.x) * k;
      const y = p.y + (q.y - p.y) * k;
      ts.push(d.x * (x - a.x) + d.y * (y - a.y));
    }
  }
  ts.sort((u, v) => u - v);
  const out: [Pt, Pt][] = [];
  for (let i = 0; i + 1 < ts.length; i += 2) {
    out.push([
      { x: a.x + d.x * ts[i], y: a.y + d.y * ts[i] },
      { x: a.x + d.x * ts[i + 1], y: a.y + d.y * ts[i + 1] },
    ]);
  }
  return out;
}

/** Shortens a segment by `by` px at each end; null when nothing is left. */
function inset([p, q]: [Pt, Pt], by: number): [Pt, Pt] | null {
  const L = Math.hypot(q.x - p.x, q.y - p.y);
  if (L <= 2 * by) {
    return null;
  }
  const ux = (q.x - p.x) / L;
  const uy = (q.y - p.y) / L;
  return [
    { x: p.x + ux * by, y: p.y + uy * by },
    { x: q.x - ux * by, y: q.y - uy * by },
  ];
}

function boundsOf(poly: Pt[]): Box {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const p of poly) {
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return { left, top, right, bottom };
}

function stroke(points: Pt[], penColor: StrokeSpec['penColor'], thickness: number): StrokeSpec {
  return { points, pressures: points.map(() => PRESSURE), penType: 10, penColor, thickness: firmwareWidth(thickness) };
}

function straight([p, q]: [Pt, Pt]): Pt[] {
  return resample([[p.x, p.y], [q.x, q.y]], STEP).map(([x, y]) => ({ x, y }));
}

/** Dense horizontal lines that overlap into a flat tone. */
function solid(outline: Pt[], b: Box, color: StrokeSpec['penColor'], width: number): StrokeSpec[] {
  const out: StrokeSpec[] = [];
  const gap = Math.max(1, 0.9 * widthPx(width));
  const half = widthPx(width) / 2;
  for (let y = b.top + gap / 2; y < b.bottom; y += gap) {
    for (const seg of clipLine(outline, { x: b.left - 1, y }, { x: 1, y: 0 })) {
      const s = inset(seg, half);
      if (s) {
        out.push(stroke(straight(s), color, width));
      }
    }
  }
  return out;
}

/** Pen width for head fills: fine enough that the round caps leave a straight edge where no outline covers it. */
const HEAD_FILL_WIDTH = 200;

/** Solid fill in the ink's colour for a closed arrow head, whatever the shape's weight or fill. */
export function headStrokes(outline: Pt[], color: StrokeSpec['penColor']): StrokeSpec[] {
  return solid(outline, boundsOf(outline), color, HEAD_FILL_WIDTH);
}

/**
 * Fill strokes for a closed outline. Segments stop half a stroke width short
 * of the boundary so round caps stay inside the outline. `gap` is the
 * perpendicular hatch spacing in page px.
 */
export function fillStrokes(outline: Pt[], style: Style, width: number, seed: number, gap: number): StrokeSpec[] {
  if (style.fill === 'none' || outline.length < 4) {
    return [];
  }
  const b = boundsOf(outline);
  const h = b.bottom - b.top;
  const w = b.right - b.left;
  if (!(w > 0 && h > 0)) {
    return [];
  }
  if (style.fill === 'solid') {
    return solid(outline, b, TONE_COLOR[style.tone], width);
  }
  const out: StrokeSpec[] = [];

  // Hatch: 45° lines stepped along x, so the step along x is √2 times the gap.
  const thickness = HATCH_SHARE * width;
  const step = gap * Math.SQRT2;
  const half = widthPx(thickness) / 2;
  const k = Math.max(w, h) / 200;
  const T = { bow: LOCKED.bow * k * 0.5, swing: LOCKED.swing * 0.5, over: 0, step: STEP };
  const rnd = seeded(seed);
  const directions: Array<1 | -1> = style.fill === 'cross' ? [1, -1] : [1];
  for (const dir of directions) {
    for (const seg of diagonals(outline, b, step, dir)) {
      const s = inset(seg, half);
      if (!s) {
        continue;
      }
      const pts =
        style.look === 'hand'
          ? handDraw([[s[0].x, s[0].y], [s[1].x, s[1].y]] as XY[], thickness, rnd, T, false).map(p => ({ x: p.x, y: p.y }))
          : straight(s);
      if (pts.length > 1) {
        out.push(stroke(pts, 0, thickness));
      }
    }
  }
  return out;
}

/**
 * The 45° lines through `poly`, `step` apart along x. `dir` 1 runs down-right
 * (the lines start left of the box), -1 runs down-left (they start past its
 * right edge). The pattern is phased so one line passes through the centre of
 * the box: a shape narrower than the step still gets that line instead of none.
 */
function diagonals(poly: Pt[], b: Box, step: number, dir: 1 | -1): [Pt, Pt][] {
  const h = b.bottom - b.top;
  const d = { x: dir * Math.SQRT1_2, y: Math.SQRT1_2 };
  const from = dir > 0 ? b.left - h : b.left;
  const to = dir > 0 ? b.right : b.right + h;
  // Where the line through the centre meets y = top.
  const centre = (b.left + b.right) / 2 - (dir * h) / 2;
  const start = centre - Math.ceil((centre - from) / step) * step;
  const out: [Pt, Pt][] = [];
  for (let x = start; x < to; x += step) {
    out.push(...clipLine(poly, { x, y: b.top }, d));
  }
  return out;
}
