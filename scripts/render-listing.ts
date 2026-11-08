/// <reference types="node" />
/**
 * Composes the InkHub listing images from Manta screenshots. Run with
 * `npm run listing` and commit the output.
 *
 * Raw screenshots go in docs/listing/raw/ under the names in IMAGES; shots of
 * the plugin's own UI are built on 01-diagram.png (its sidebar and
 * handwriting), which is not a listing image itself. Each shot is cropped to
 * the page (the device sidebar and footer are cut), optionally to a region of
 * it, and placed under a caption; pairs sit side by side or stacked, whichever
 * shows the crop larger. A spec without a caption is a page of its own, such as
 * a one-pager written on the device: it fills the image, unframed.
 */
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { scenes } from './listing-scenes';

type Rect = { x: number; y: number; w: number; h: number };
type Shot = ({ file: string } | { scene: string }) & { label?: string };
type Spec = { name: string; caption?: string; shots: Shot[]; crop?: Rect };

const DIR = join(__dirname, '..', 'docs', 'listing');
const RAW = join(DIR, 'raw');

// Manta screenshot (1920 x 2560): the sidebar ends at x 116, the footer starts at y 2485.
const PAGE: Rect = { x: 124, y: 0, w: 1796, h: 2470 };

// Output follows the device until InkHub's upload form asks for something else.
const OUT_W = 1920;
const OUT_H = 2560;
const MARGIN = 120;
const CAPTION_SIZE = 84;
const LABEL_SIZE = 44;
const GAP = 80;
const INK = '#111';
const GREY = '#777';
const FRAME = '#bbb';

const FONT_PATH = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf';
const FONT = 'Noto Sans';

// Crops are in screenshot pixels. The firmware's screenshots leave out the
// plugin view, so the shots that show Stencil's UI are scenes (listing-scenes.ts).
const IMAGES: Spec[] = [
  {
    name: '01-this-is-stencil',
    shots: [{ file: '01-this-is-stencil.png' }],
  },
  {
    name: '02-styles',
    caption: 'Fills, tones, dashes and curved arrows',
    shots: [{ file: '02-styles.png' }],
    crop: { x: 200, y: 0, w: 1600, h: 2400 },
  },
  {
    name: '03-panel',
    caption: '22 shapes, clean or hand-drawn',
    shots: [{ scene: 'panel' }],
    crop: { x: 0, y: 0, w: 1060, h: 1460 },
  },
  {
    name: '04-place',
    caption: 'Tap for the default size, drag to size it',
    shots: [
      { scene: 'placeDrag', label: 'Drag' },
      { scene: 'placeDone', label: 'Placed' },
    ],
    crop: { x: 0, y: 0, w: 1920, h: 900 },
  },
  {
    name: '05-wrap',
    caption: 'Lasso your writing, wrap it in a shape',
    shots: [
      { scene: 'wrapBefore', label: 'Lasso, then tap Stencil' },
      { scene: 'wrapAfter', label: 'Pick a shape' },
    ],
    crop: { x: 470, y: 900, w: 980, h: 470 },
  },
  {
    name: '06-redraw',
    caption: 'Stretch with the lasso, redraw it clean',
    shots: [
      { scene: 'redrawBefore', label: 'Stretched' },
      { scene: 'redrawAfter', label: 'Redrawn' },
    ],
    crop: { x: 0, y: 0, w: 1920, h: 900 },
  },
];

function fit(src: { w: number; h: number }, box: Rect): Rect {
  const s = Math.min(box.w / src.w, box.h / src.h);
  const w = src.w * s;
  const h = src.h * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function text(ctx: SKRSContext2D, s: string, size: number, color: string, x: number, y: number) {
  ctx.font = `${size}px "${FONT}"`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}

async function compose(spec: Spec, built: Record<string, string>): Promise<Buffer | null> {
  const missing = spec.shots.flatMap(s => {
    const ok = 'file' in s ? existsSync(join(RAW, s.file)) : s.scene in built;
    return ok ? [] : ['file' in s ? s.file : '01-diagram.png'];
  });
  if (missing.length > 0) {
    console.warn(`${spec.name}: skipped, missing ${missing.join(', ')}`);
    return null;
  }
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  const crop = spec.crop ?? PAGE;
  if (!spec.caption) {
    const shot = spec.shots[0];
    const img = await loadImage('file' in shot ? join(RAW, shot.file) : Buffer.from(built[shot.scene]));
    const dst = fit(crop, { x: 0, y: 0, w: OUT_W, h: OUT_H });
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, dst.x, dst.y, dst.w, dst.h);
    return canvas.toBuffer('image/png');
  }
  text(ctx, spec.caption, CAPTION_SIZE, INK, OUT_W / 2, MARGIN);

  const labelled = spec.shots.some(s => s.label);
  const top = MARGIN + CAPTION_SIZE * 1.4 + GAP;
  const n = spec.shots.length;
  const lab = labelled ? LABEL_SIZE * 1.4 + GAP / 2 : 0;
  const availW = OUT_W - 2 * MARGIN;
  const availH = OUT_H - top - MARGIN;
  const row = { w: (availW - (n - 1) * GAP) / n, h: availH - lab };
  const col = { w: availW, h: (availH - (n - 1) * GAP) / n - lab };
  const scale = (c: { w: number; h: number }) => Math.min(c.w / crop.w, c.h / crop.h);
  const stacked = n > 1 && scale(col) > scale(row);
  const cell = stacked ? col : row;
  const used = fit(crop, { x: 0, y: 0, ...cell });
  // Centre the whole block of shots and labels in the space under the caption.
  const y0 = top + (availH - (stacked ? n * (used.h + lab) + (n - 1) * GAP : used.h + lab)) / 2;

  for (const [i, shot] of spec.shots.entries()) {
    const img = await loadImage('file' in shot ? join(RAW, shot.file) : Buffer.from(built[shot.scene]));
    const box = stacked
      ? { x: MARGIN, y: y0 + i * (used.h + lab + GAP), w: cell.w, h: used.h }
      : { x: MARGIN + i * (cell.w + GAP), y: y0, w: cell.w, h: used.h };
    const dst = fit(crop, box);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, dst.x, dst.y, dst.w, dst.h);
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = 2;
    ctx.strokeRect(dst.x, dst.y, dst.w, dst.h);
    if (shot.label) {
      text(ctx, shot.label, LABEL_SIZE, GREY, dst.x + dst.w / 2, dst.y + dst.h + GAP / 2);
    }
  }
  return canvas.toBuffer('image/png');
}

async function main() {
  if (!GlobalFonts.registerFromPath(FONT_PATH, FONT)) {
    throw new Error(`Font not found: ${FONT_PATH}`);
  }
  mkdirSync(RAW, { recursive: true });
  // Scenes reuse the device sidebar and the handwriting of the diagram shot.
  const diagram = join(RAW, '01-diagram.png');
  const built = existsSync(diagram) ? scenes(readFileSync(diagram)) : {};
  for (const spec of IMAGES) {
    const png = await compose(spec, built);
    if (png) {
      const path = join(DIR, `${spec.name}.png`);
      writeFileSync(path, png);
      console.log(path);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
