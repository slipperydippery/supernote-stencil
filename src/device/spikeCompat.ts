/**
 * Spike-only helpers kept so `src/spikes.ts` and `App.tsx` compile against the
 * device layer. PR 3 deletes this file together with `src/strokes.ts`.
 */
import { PluginCommAPI, type Point, type Rect } from 'sn-plugin-lib';
import type { Plan } from './contracts';
import { insertTagged } from './elements';
import { currentPage as devicePage, type PageCtx as DevicePageCtx } from './page';
import { call } from './sdk';

export const PEN = {
  technical: 10,
  marker: 11,
  calligraphy: 15,
  pressure: 16,
} as const;

export const INK = { black: 0, darkGrey: 157, lightGrey: 201, white: 254 } as const;

export type StrokeSpec = {
  points: Point[];
  /** 0..4096, one per point. */
  pressures: number[];
  penType: number;
  penColor?: number;
  thickness?: number;
  /** Ignored since GH-3: the page-element path never writes pen-up flags. */
  flagDraw?: boolean[];
  /** Ignored since GH-3: stroke metadata breaks lasso hit-testing. */
  metadata?: boolean;
  /** Free-form tag stored on the element; Stencil keeps the shape recipe here. */
  userData?: string;
};

export type PageCtx = DevicePageCtx & {
  penInfo: { type: number; color: number; width: number } | null;
};

export async function currentPage(): Promise<PageCtx> {
  const ctx = await devicePage();
  let penInfo: PageCtx['penInfo'] = null;
  try {
    penInfo = await call<PageCtx['penInfo']>('getPenInfo', PluginCommAPI.getPenInfo());
  } catch (e) {
    console.warn('getPenInfo failed', e);
  }
  return { ...ctx, penInfo };
}

/** Points along a straight segment, `step` pixels apart, both ends included. */
export function sampleLine(a: Point, b: Point, step = 4): Point[] {
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    out.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  }
  return out;
}

export function constant<T>(value: T, n: number): T[] {
  return Array.from({ length: n }, () => value);
}

/** Linear pressure ramp from `from` to `to` over n points. */
export function ramp(from: number, to: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / Math.max(1, n - 1)));
}

export function bounds(specs: StrokeSpec[]): Rect {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const s of specs) {
    for (const p of s.points) {
      left = Math.min(left, p.x);
      top = Math.min(top, p.y);
      right = Math.max(right, p.x);
      bottom = Math.max(bottom, p.y);
    }
  }
  return { left: Math.floor(left), top: Math.floor(top), right: Math.ceil(right), bottom: Math.ceil(bottom) };
}

/** The spike's insert, routed through the device layer; one insert per distinct tag. */
export async function insertStrokes(ctx: PageCtx, specs: StrokeSpec[]): Promise<Rect> {
  const groups = new Map<string, StrokeSpec[]>();
  for (const s of specs) {
    const tag = s.userData ?? '';
    groups.set(tag, [...(groups.get(tag) ?? []), s]);
  }
  for (const [tag, group] of groups) {
    const plan: Plan = {
      strokes: group.map(s => ({
        points: s.points,
        pressures: s.pressures,
        penType: s.penType as 10 | 16,
        penColor: (s.penColor ?? INK.black) as 0,
        // Integer-valued thickness rendered as hairlines in the thickness ladder, so keep a fraction.
        thickness: (s.thickness ?? ctx.penInfo?.width ?? 600) + 0.001,
      })),
      geometries: [],
      bounds: bounds(group),
    };
    await insertTagged(ctx, plan, tag);
  }
  return bounds(specs);
}

export async function lasso(rect: Rect, pad = 6): Promise<void> {
  await call(
    'lassoElements',
    PluginCommAPI.lassoElements({
      left: rect.left - pad,
      top: rect.top - pad,
      right: rect.right + pad,
      bottom: rect.bottom + pad,
    }),
  );
}
