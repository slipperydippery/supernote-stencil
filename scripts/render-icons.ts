/// <reference types="node" />
/**
 * Rasterises the palette's shape icons and style glyphs to PNG, because the
 * plugin has no SVG at runtime. Run with `npm run icons` and commit the output.
 *
 * Shape icons are drawn from the real renderer's clean, normal plan, so they
 * match what lands on the page. Glyphs reproduce the design page's `G` table.
 */
import { createCanvas, Path2D, type SKRSContext2D } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { renderShape } from '../src/render/plan';
import { DEFAULT_STYLE } from '../src/render/style';
import { SHAPES, type Pt, type ShapeId } from '../src/shapes';

const ROOT = join(__dirname, '..', 'assets');
const ICON = 160;
const MARGIN = 18;
const ICON_LINE = 4;
const INK = '#111';

function save(path: string, buf: Buffer) {
  writeFileSync(path, buf);
  console.log(path);
}

function shapeIcon(id: ShapeId): Buffer {
  const def = SHAPES[id];
  const { w, h } = def.defaultSize;
  const plan = renderShape(def, { left: 0, top: 0, right: w, bottom: h }, DEFAULT_STYLE, 0);
  const b = plan.bounds;
  const bw = b.right - b.left;
  const bh = b.bottom - b.top;
  const s = (ICON - 2 * MARGIN) / Math.max(bw, bh);
  const ox = (ICON - bw * s) / 2 - b.left * s;
  const oy = (ICON - bh * s) / 2 - b.top * s;
  const tx = (p: Pt) => [ox + p.x * s, oy + p.y * s] as const;

  const canvas = createCanvas(ICON, ICON);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = INK;
  ctx.lineWidth = ICON_LINE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const g of plan.geometries) {
    ctx.beginPath();
    if (g.type === 'GEO_ellipse' && g.ellipseCenterPoint) {
      const [cx, cy] = tx(g.ellipseCenterPoint);
      ctx.ellipse(cx, cy, g.ellipseMajorAxisRadius * s, g.ellipseMinorAxisRadius * s, g.ellipseAngle, 0, Math.PI * 2);
    } else {
      g.points.forEach((p, i) => (i === 0 ? ctx.moveTo(...tx(p)) : ctx.lineTo(...tx(p))));
      if (g.type === 'GEO_polygon') {
        ctx.closePath();
      }
    }
    ctx.stroke();
  }
  for (const st of plan.strokes) {
    ctx.beginPath();
    st.points.forEach((p, i) => (i === 0 ? ctx.moveTo(...tx(p)) : ctx.lineTo(...tx(p))));
    ctx.stroke();
  }
  return canvas.toBuffer('image/png');
}

type Draw = (ctx: SKRSContext2D) => void;

function line(d: string, width: number, dash?: number[]): Draw {
  return ctx => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.setLineDash(dash ?? []);
    ctx.stroke(new Path2D(d));
  };
}

const SQUARE = { x: 5, y: 1.5, w: 12, h: 11 };

function square(fill: string | null, hatch = false): Draw {
  return ctx => {
    const { x, y, w, h } = SQUARE;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
    if (hatch) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke(new Path2D('M2 12 L12 2M6 15 L16 5M10 15 L20 5M-2 12 L8 2'));
      ctx.restore();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, h);
  };
}

// Viewbox 22 x 14, drawn at 2x.
const GLYPHS: Record<string, Draw> = {
  'weight-thin': line('M3 7h16', 1),
  'weight-normal': line('M3 7h16', 2.2),
  'weight-thick': line('M3 7h16', 3.8),
  'line-solid': line('M3 7h16', 1.8),
  'line-dashed': line('M3 7h16', 1.8, [4, 3]),
  'line-dotted': line('M3 7h16', 1.8, [0.1, 3.2]),
  'fill-none': square(null),
  'fill-hatch': square(null, true),
  'fill-light': square('#c9c9c9'),
  'fill-dark': square('#9d9d9d'),
  'look-clean': line('M3 9 L19 5', 1.8),
  'look-hand': line('M3 9 C7 3, 10 11, 14 6 S18 4, 19 6', 1.8),
};

function glyph(draw: Draw): Buffer {
  const canvas = createCanvas(44, 28);
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  draw(ctx);
  return canvas.toBuffer('image/png');
}

mkdirSync(join(ROOT, 'shapes'), { recursive: true });
mkdirSync(join(ROOT, 'glyphs'), { recursive: true });
for (const id of Object.keys(SHAPES) as ShapeId[]) {
  save(join(ROOT, 'shapes', `${id}.png`), shapeIcon(id));
}
for (const [name, draw] of Object.entries(GLYPHS)) {
  save(join(ROOT, 'glyphs', `${name}.png`), glyph(draw));
}
