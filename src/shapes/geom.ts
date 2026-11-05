/**
 * Outline builders. Shapes are described in unit coordinates (0..1 across the
 * box) taken from the reference renderer's 200 x 120 preview, normalised to each
 * shape's own bounds so the outline fills the box it is given.
 */
import type { Box, Pt } from './types';

export type Frame = { x: number; y: number; w: number; h: number };

export function frame(box: Box): Frame {
  return { x: box.left, y: box.top, w: box.right - box.left, h: box.bottom - box.top };
}

/** Point at unit coordinates (u, v) inside the frame. */
export function at(f: Frame, u: number, v: number): Pt {
  return { x: f.x + f.w * u, y: f.y + f.h * v };
}

export function closedPoly(f: Frame, uv: [number, number][]): Pt[][] {
  const pts = uv.map(([u, v]) => at(f, u, v));
  return [[...pts, pts[0]]];
}

/** Arc of an axis-aligned ellipse, n segments, n + 1 points including both ends. */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

export function roundedRect(f: Frame, r: number): Pt[][] {
  const { x, y, w, h } = f;
  const p: Pt[] = [
    ...arc(x + w - r, y + r, r, r, -Math.PI / 2, 0, 10),
    ...arc(x + w - r, y + h - r, r, r, 0, Math.PI / 2, 10),
    ...arc(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, 10),
    ...arc(x + r, y + r, r, r, Math.PI, 1.5 * Math.PI, 10),
  ];
  p.push(p[0]);
  return [p];
}

/** Full ellipse from the top, n segments; the last point is the first, exactly. */
export function ellipse(f: Frame, n: number): Pt[][] {
  const p = arc(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, -Math.PI / 2, 1.5 * Math.PI, n);
  p[n] = p[0];
  return [p];
}

/** Arrow head: two barbs at ±0.82π from the shaft direction, as an open three-point polyline through the tip. */
export function head(tip: Pt, angle: number, f: Frame): Pt[] {
  const len = Math.max(24, 0.09 * Math.max(f.w, f.h));
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  return [
    { x: tip.x + len * Math.cos(a1), y: tip.y + len * Math.sin(a1) },
    tip,
    { x: tip.x + len * Math.cos(a2), y: tip.y + len * Math.sin(a2) },
  ];
}
