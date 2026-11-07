/// <reference types="node" />
/**
 * Composes the InkHub listing images from Manta screenshots. Run with
 * `npm run listing` and commit the output.
 *
 * Raw screenshots go in docs/listing/raw/ under the names in IMAGES. Each one
 * is cropped to the page (the device sidebar and footer are cut), optionally
 * to a region of it, and placed under a caption; pairs sit side by side.
 */
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

type Rect = { x: number; y: number; w: number; h: number };
type Shot = { file: string; label?: string };
type Spec = { name: string; caption: string; shots: Shot[]; crop?: Rect };

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

// Crops are in screenshot pixels; set them once the real shots exist.
const IMAGES: Spec[] = [
  {
    name: '01-diagram',
    caption: 'Diagram shapes, placed with the pen',
    shots: [{ file: '01-diagram.png' }],
  },
  {
    name: '02-panel',
    caption: '22 shapes in three families, clean or hand-drawn',
    shots: [{ file: '02-panel.png' }],
  },
  {
    name: '03-place',
    caption: 'Tap for the default size, drag to size it',
    shots: [
      { file: '03-place-drag.png', label: 'Drag' },
      { file: '03-place-done.png', label: 'Placed' },
    ],
  },
  {
    name: '04-wrap',
    caption: 'Lasso your writing, wrap it in a shape',
    shots: [
      { file: '04-wrap-before.png', label: 'Before' },
      { file: '04-wrap-after.png', label: 'After' },
    ],
  },
  {
    name: '05-redraw',
    caption: 'Redraw a shape into a new box',
    shots: [
      { file: '05-redraw-before.png', label: 'Before' },
      { file: '05-redraw-after.png', label: 'After' },
    ],
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

async function compose(spec: Spec): Promise<Buffer | null> {
  const missing = spec.shots.filter(s => !existsSync(join(RAW, s.file)));
  if (missing.length > 0) {
    console.warn(`${spec.name}: skipped, missing ${missing.map(s => s.file).join(', ')}`);
    return null;
  }
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  text(ctx, spec.caption, CAPTION_SIZE, INK, OUT_W / 2, MARGIN);

  const crop = spec.crop ?? PAGE;
  const labelled = spec.shots.some(s => s.label);
  const top = MARGIN + CAPTION_SIZE * 1.4 + GAP;
  const n = spec.shots.length;
  const cellW = (OUT_W - 2 * MARGIN - (n - 1) * GAP) / n;
  const cellH = OUT_H - top - MARGIN - (labelled ? LABEL_SIZE * 1.4 + GAP / 2 : 0);

  for (const [i, shot] of spec.shots.entries()) {
    const img = await loadImage(join(RAW, shot.file));
    const dst = fit(crop, { x: MARGIN + i * (cellW + GAP), y: top, w: cellW, h: cellH });
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
  for (const spec of IMAGES) {
    const png = await compose(spec);
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
