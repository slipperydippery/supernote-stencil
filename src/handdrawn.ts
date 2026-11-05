/**
 * Hand-drawn look, ported from the design prototype. Constants are expressed
 * in a 200-unit preview space and scaled by the shape's long side.
 *
 * One outline becomes several pen strokes: split at corners sharper than 35
 * degrees, long smooth runs split again into hand-length pieces. Each stroke
 * gets a single bow, a width profile over its length and a small overshoot
 * where it meets another stroke. Width is later mapped to pen pressure.
 */
import type { Point } from 'sn-plugin-lib';

export type Pt = [number, number];
export type Sample = { x: number; y: number; w: number };

export const LOCKED = { bow: 2, swing: 0.4, over: 3, penLen: 130 } as const;
const PREVIEW = 200;

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 1; k <= n; k++) {
      out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
  }
  return out;
}

function cum(pts: Pt[]): number[] {
  const s = [0];
  for (let i = 1; i < pts.length; i++) {
    s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return s;
}

function turn(a: Pt, b: Pt, c: Pt): number {
  const u = [b[0] - a[0], b[1] - a[1]];
  const v = [c[0] - b[0], c[1] - b[1]];
  return Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]));
}

export function splitStrokes(pts: Pt[], closed: boolean): Pt[][] {
  const LIM = (35 * Math.PI) / 180;
  const strokes: Pt[][] = [];
  let cur: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    cur.push(pts[i]);
    if (i < pts.length - 1 && turn(pts[i - 1], pts[i], pts[i + 1]) > LIM) {
      strokes.push(cur);
      cur = [pts[i]];
    }
  }
  strokes.push(cur);
  if (closed && strokes.length > 1 && turn(pts[pts.length - 2], pts[0], pts[1]) <= LIM) {
    const last = strokes.pop()!;
    strokes[0] = last.concat(strokes[0].slice(1));
  }
  return strokes;
}

export function splitLong(stroke: Pt[], maxLen: number): Pt[][] {
  const s = cum(stroke);
  const L = s[s.length - 1];
  const n = Math.ceil(L / maxLen);
  if (n < 2) {
    return [stroke];
  }
  const out: Pt[][] = [];
  let piece: Pt[] = [stroke[0]];
  let k = 1;
  for (let i = 1; i < stroke.length; i++) {
    piece.push(stroke[i]);
    if (s[i] >= (L * k) / n && k < n) {
      out.push(piece);
      piece = [stroke[i]];
      k++;
    }
  }
  if (piece.length > 1) {
    out.push(piece);
  }
  return out;
}

function normalAt(pts: Pt[], i: number): Pt {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return [-dy / L, dx / L];
}

function tangentEnd(pts: Pt[], atStart: boolean): Pt {
  const n = pts.length;
  const a = atStart ? pts[1] : pts[n - 2];
  const b = atStart ? pts[0] : pts[n - 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return [dx / L, dy / L];
}

export type HandOpts = { bow: number; swing: number; over: number; step: number };

/** One pen stroke: bow, width profile, overshoot. `base` is the nominal width. */
export function handDraw(stroke: Pt[], base: number, rnd: () => number, T: HandOpts, closed: boolean): Sample[] {
  if (stroke.length < 2) {
    return [];
  }
  let pts = resample(stroke, T.step);
  if (pts.length < 2) {
    return [];
  }
  const L = cum(pts).pop() || 1;
  if (closed && T.over > 0) {
    const o0 = T.over * (0.3 + rnd() * 0.7);
    const o1 = T.over * (0.3 + rnd() * 0.7);
    const t0 = tangentEnd(pts, true);
    const t1 = tangentEnd(pts, false);
    const last = pts[pts.length - 1];
    pts = [[pts[0][0] + t0[0] * o0, pts[0][1] + t0[1] * o0], ...pts, [last[0] + t1[0] * o1, last[1] + t1[1] * o1]];
  }
  const s2 = cum(pts);
  const L2 = s2[s2.length - 1] || 1;
  const amp = T.bow * (rnd() - 0.5) * 2 * Math.min(1, L / (T.step * 15));
  const profile = Math.floor(rnd() * 4);
  const sw = T.swing;
  const out: Sample[] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = s2[i] / L2;
    const n = normalAt(pts, i);
    const b = amp * Math.sin(Math.PI * t);
    let w: number;
    if (profile === 0) {
      w = base * (1 - sw / 2 + sw * Math.sin(Math.PI * t));
    } else if (profile === 1) {
      w = base * (1 + sw / 2 - sw * Math.sin(Math.PI * t));
    } else if (profile === 2) {
      w = base * (1 - sw / 2 + sw * t);
    } else {
      w = base * (1 + sw / 2 - sw * t);
    }
    out.push({ x: pts[i][0] + n[0] * b, y: pts[i][1] + n[1] * b, w: Math.max(base * 0.35, w) });
  }
  return out;
}

/**
 * Turns an outline in page pixels into hand-drawn pen strokes. Constants scale
 * with the outline's long side so a 480 px box gets the same look as the preview.
 */
export function handDrawnOutline(outline: Pt[], closed: boolean, seed: number, base: number): Sample[][] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const k = Math.max(maxX - minX, maxY - minY) / PREVIEW;
  const T: HandOpts = { bow: LOCKED.bow * k, swing: LOCKED.swing, over: LOCKED.over * k, step: 4 };
  const rnd = mulberry32(seed * 7919 + 13);
  return splitStrokes(outline, closed)
    .flatMap(st => splitLong(st, LOCKED.penLen * k))
    .map(st => handDraw(st, base, rnd, T, closed))
    .filter(s => s.length > 1);
}

/**
 * Pressure on pen type 16 for a wanted fraction of the element's full width.
 * Measured on a Manta (rendered px at one thickness): 400 → 2, 800 → 4,
 * 1200 → 5, 1600 → 6 = full width, flat above. Pen 16 can only go thinner
 * than the element thickness, never thicker, so callers set the thickness
 * to the widest point of the profile and map every sample down from it.
 */
const PRESSURE_CURVE: ReadonlyArray<[number, number]> = [
  [0.33, 400],
  [0.67, 800],
  [0.83, 1200],
  [1.0, 1600],
];
export function pressureForFraction(f: number): number {
  if (f <= PRESSURE_CURVE[0][0]) {
    return PRESSURE_CURVE[0][1];
  }
  for (let i = 1; i < PRESSURE_CURVE.length; i++) {
    const [f0, p0] = PRESSURE_CURVE[i - 1];
    const [f1, p1] = PRESSURE_CURVE[i];
    if (f <= f1) {
      return Math.round(p0 + ((f - f0) / (f1 - f0)) * (p1 - p0));
    }
  }
  return PRESSURE_CURVE[PRESSURE_CURVE.length - 1][1];
}

/** Element thickness that makes a profile with `swing` peak at `base`-equivalent darkness. */
export function peakThickness(base: number, swing: number): number {
  return base * (1 + swing / 2);
}

/** Pressure for a sample width `w` on an element whose thickness is `peak`. */
export function pressureFromWidth(w: number, peak: number): number {
  return pressureForFraction(w / peak);
}

export function toPoints(samples: Sample[]): Point[] {
  return samples.map(s => ({ x: s.x, y: s.y }));
}
