/**
 * Dashes and dots as separate strokes: the firmware draws neither a pen-up flag
 * nor zero pressure as a gap (repo README, finding "4 flagDraw gap").
 */
import type { Line } from './style';
import { widthPx } from './style';

type P = { x: number; y: number };

export type DashLengths = { on: number; off: number; dot: number };

/** Dash, gap and dot spacing in page px for an internal width, after the reference renderer's 4.2 / 2.8 / 2.6. */
export function dashLengths(width: number): DashLengths {
  const w = widthPx(width);
  return { on: 4.2 * w, off: 2.8 * w, dot: 2.6 * w };
}

/** Splits a densely sampled polyline into dash pieces, starting with a dash. */
export function pieces<T extends P>(samples: T[], on: number, off: number): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let acc = 0;
  let drawing = true;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) {
      acc += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    }
    if (drawing) {
      cur.push(samples[i]);
      if (acc >= on) {
        if (cur.length > 1) {
          out.push(cur);
        }
        cur = [];
        acc = 0;
        drawing = false;
      }
    } else if (acc >= off) {
      acc = 0;
      drawing = true;
      cur = [samples[i]];
    }
  }
  if (cur.length > 1) {
    out.push(cur);
  }
  return out;
}

/** Dots every `gap` px along the polyline, each a two-point stroke 1 px long in the direction of travel. */
export function dots<T extends P>(samples: T[], gap: number): T[][] {
  const out: T[][] = [];
  let acc = gap;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) {
      acc += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    }
    if (acc < gap) {
      continue;
    }
    acc = 0;
    const a = samples[i];
    const b = samples[i + 1] ?? samples[i - 1];
    let dx = 1;
    let dy = 0;
    if (b) {
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const sign = samples[i + 1] ? 1 : -1;
      dx = ((b.x - a.x) / L) * sign;
      dy = ((b.y - a.y) / L) * sign;
    }
    out.push([a, { ...a, x: a.x + dx, y: a.y + dy }]);
  }
  return out;
}

/** Dash or dot pieces for a sampled polyline; solid returns it whole. */
export function dashSamples<T extends P>(samples: T[], line: Line, width: number): T[][] {
  const d = dashLengths(width);
  if (line === 'dashed') {
    return pieces(samples, d.on, d.off);
  }
  if (line === 'dotted') {
    return dots(samples, d.dot);
  }
  return [samples];
}
