import {
  Element,
  PluginCommAPI,
  PluginFileAPI,
  type ElementDataAccessor,
  type Point,
  type Rect,
} from 'sn-plugin-lib';
import { call, recycle } from './sdk';

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
  /** Pen-down flag per point. Omitted = all true. */
  flagDraw?: boolean[];
  /** Also fill contours, angles, marker direction and recognition points. */
  metadata?: boolean;
  /** Free-form tag stored on the element; Stencil keeps the shape recipe here. */
  userData?: string;
};

export type PageCtx = {
  notePath: string;
  page: number;
  width: number;
  height: number;
  /** Page width relative to a Manta page; scales default sizes. */
  unit: number;
  penInfo: { type: number; color: number; width: number } | null;
};

export async function currentPage(): Promise<PageCtx> {
  const notePath = await call<string>('getCurrentFilePath', PluginCommAPI.getCurrentFilePath());
  const page = await call<number>('getCurrentPageNum', PluginCommAPI.getCurrentPageNum());
  const size = await call<{ width: number; height: number }>(
    'getPageSize',
    PluginFileAPI.getPageSize(notePath, page),
  );
  let penInfo: PageCtx['penInfo'] = null;
  try {
    penInfo = await call<PageCtx['penInfo']>('getPenInfo', PluginCommAPI.getPenInfo());
  } catch (e) {
    console.warn('getPenInfo failed', e);
  }
  return { notePath, page, width: size.width, height: size.height, unit: size.width / 1920, penInfo };
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

async function writeAll<T>(acc: ElementDataAccessor<any> | null | undefined, values: T[]): Promise<void> {
  if (acc && values.length > 0) {
    await acc.setRange(0, values.length - 1, values as any);
  }
}

/**
 * Inserts strokes into the open page through the page-element API, which
 * redraws by itself. The file-based insertElements route needs a save
 * before and a reload after, and the reload has been seen to read a stale
 * file and drop freshly written strokes (supernote-snap README).
 */
export async function insertStrokes(ctx: PageCtx, specs: StrokeSpec[]): Promise<Rect> {
  const created: Element[] = [];
  try {
    for (const spec of specs) {
      const el = await call<Element>('createElement', PluginCommAPI.createElement(Element.TYPE_STROKE));
      created.push(el);
      el.pageNum = ctx.page;
      el.layerNum = 0;
      // Internal width unit, the same as Geometry.penWidth: pen 0.5 mm is about 600.
      // Integer-valued numbers rendered as hairlines in the thickness ladder, so keep a fraction.
      el.thickness = (spec.thickness ?? ctx.penInfo?.width ?? 600) + 0.001;
      el.stroke!.penColor = spec.penColor ?? INK.black;
      el.stroke!.penType = spec.penType;
      if (spec.userData) {
        el.userData = spec.userData;
      }
      await writeAll(el.stroke!.points, spec.points);
      await writeAll(el.stroke!.pressures, spec.pressures);
      if (spec.flagDraw) {
        await writeAll(el.stroke!.flagDraw, spec.flagDraw);
      }
      if (spec.metadata) {
        const n = spec.points.length;
        if (!spec.flagDraw) {
          await writeAll(el.stroke!.flagDraw, constant(true, n));
        }
        await writeAll(el.contoursSrc, [spec.points]);
        await writeAll(el.angles, constant({ x: 0, y: 0 }, n));
        await writeAll(el.stroke!.markPenDirection, constant({ x: 0, y: 0 }, n));
        const t0 = Date.now();
        await writeAll(
          el.stroke!.recognPoints,
          spec.points.map((p, i) => ({ X: p.x, Y: p.y, Flag: i === 0 ? 0 : i === n - 1 ? 2 : 1, timestamp: t0 + i * 8 })),
        );
      }
    }
    await call('insertPageElements', PluginCommAPI.insertPageElements(created, ctx.page));
  } finally {
    for (const el of created) {
      recycle(el);
    }
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
