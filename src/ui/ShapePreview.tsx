import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Pt } from '../shapes';
import { INK } from './theme';

const LINE = 2;
/** dp per staircase step on a diagonal segment: coarser is fewer views, finer reads closer to a straight line. */
const STEP_LEN = 5;
const MAX_STEPS = 24;

export type Rect = { left: number; top: number; width: number; height: number };

/** A horizontal hairline spanning x0..x1 at y, padded by LINE/2 on every side like the original rotated rect did. */
function hLine(x0: number, x1: number, y: number): Rect {
  return { left: Math.min(x0, x1) - LINE / 2, top: y - LINE / 2, width: Math.abs(x1 - x0) + LINE, height: LINE };
}

/** A vertical hairline spanning y0..y1 at x. */
function vLine(y0: number, y1: number, x: number): Rect {
  return { left: x - LINE / 2, top: Math.min(y0, y1) - LINE / 2, width: LINE, height: Math.abs(y1 - y0) + LINE };
}

/**
 * One segment as axis-aligned rects: no rotated view. The device's partial-refresh pen
 * tracking renders rotated content as scribble until the full refresh on release, while
 * axis-aligned fills — including the horizontal/vertical rects below — track cleanly.
 * An axis-aligned segment is one rect; a diagonal one is approximated as a staircase of them.
 */
export function segmentRects(a: Pt, b: Pt): Rect[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return [];
  }
  if (dx === 0) {
    return [vLine(a.y, b.y, a.x)];
  }
  if (dy === 0) {
    return [hLine(a.x, b.x, a.y)];
  }
  const len = Math.hypot(dx, dy);
  const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(len / STEP_LEN)));
  const rects: Rect[] = [];
  let x = a.x;
  let y = a.y;
  for (let i = 1; i <= steps; i++) {
    const nx = a.x + (dx * i) / steps;
    const ny = a.y + (dy * i) / steps;
    rects.push(hLine(x, nx, y), vLine(y, ny, nx));
    x = nx;
    y = ny;
  }
  return rects;
}

export default function ShapePreview({ outlines }: { outlines: Pt[][] }) {
  const rects: Rect[] = [];
  for (const pl of outlines) {
    for (let i = 1; i < pl.length; i++) {
      rects.push(...segmentRects(pl[i - 1], pl[i]));
    }
  }
  return (
    <View testID="rubber-band" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {rects.map((r, i) => (
        <View key={i} style={[styles.rect, r]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rect: { position: 'absolute', backgroundColor: INK },
});
