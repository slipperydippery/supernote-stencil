/// <reference types="node" />
/**
 * The second one-pager: Stencil's controls on one note page, in the look of
 * the first (a Manta note with a Bebas Neue title and Raleway captions). The
 * panel, strip and shapes are drawn from the plugin's own sizes and renderer,
 * because the firmware leaves the plugin view out of its screenshots.
 *
 * Output is a 1920 x 2560 page, the content clear of the device sidebar, so it
 * also serves as a note template (MyStyle) for a screenshot that matches page 1.
 * Fonts: docs/listing/fonts/BebasNeue-Bold.otf and Raleway-Regular.ttf, copied
 * from the device's MyStyle/fonts; `npm run onepager`.
 */
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_STYLE, type Style } from '../src/render/style';
import { dataUri, inkBox, panel, selected, shape, strip, svg, writing } from './listing-scenes';

const DIR = join(__dirname, '..', 'docs', 'listing');
const FONTS = join(DIR, 'fonts');
const OUT = join(DIR, '07-controls.png');

const TITLE = 'Bebas Neue';
const BODY = 'Raleway';
const INK = '#111';
const GREY = '#777';

/** The page clear of the firmware's sidebar (x < 124) and footer (y > 2470). */
const LEFT = 180;
const RIGHT = 1850;
const CENTRE = (124 + 1920) / 2;

const CAPTION = 50;
const LEAD = 64;

const f1 = (n: number) => Math.round(n * 10) / 10;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function title(y: number, text: string): string {
  return `<text x="${CENTRE}" y="${y}" text-anchor="middle" font-family="${TITLE}" font-size="140" fill="${INK}">${esc(text)}</text>`;
}

/** Caption lines from a top-left (or top-right with anchor end), one per entry. */
function para(x: number, y: number, lines: string[], anchor: 'start' | 'end' = 'start', size = CAPTION, fill = INK): string {
  return lines
    .map((l, i) => `<text x="${x}" y="${f1(y + size + i * LEAD)}" text-anchor="${anchor}" font-family="${BODY}" font-size="${size}" fill="${fill}">${esc(l)}</text>`)
    .join('');
}

/** Places a drawing made at page scale: scales it about its own top-left and moves that corner to (x, y). */
function place(body: string, from: { x: number; y: number }, to: { x: number; y: number }, scale: number): string {
  return `<g transform="translate(${f1(to.x)} ${f1(to.y)}) scale(${scale}) translate(${f1(-from.x)} ${f1(-from.y)})">${body}</g>`;
}

/** A short pointer from a caption towards what it names. */
function arrow(x1: number, y1: number, x2: number, y2: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (da: number) => `${f1(x2 - 22 * Math.cos(a + da))} ${f1(y2 - 22 * Math.sin(a + da))}`;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${GREY}" stroke-width="3"/><path d="M${x2} ${y2} L${head(0.45)} L${head(-0.45)} z" fill="${GREY}"/>`;
}

function page(diagramShot: Buffer): string {
  const shot = dataUri(diagramShot);
  const hand: Style = { ...DEFAULT_STYLE, look: 'hand' };
  let s = `<rect x="0" y="0" width="1920" height="2560" fill="#fff"/>`;
  s += title(230, 'HOW STENCIL WORKS');

  // 1. The panel on the left; one column of captions on the right, in the panel's own order.
  const scale = 0.62;
  const px = LEFT;
  const py = 330;
  const panelStyle: Style = { ...hand, fill: 'hatch', tone: 'light' };
  s += place(panel(panelStyle, 'decision', 'flow'), { x: 140, y: 80 }, { x: px, y: py }, scale);
  const col = px + 960 * scale + 70;
  let ty = py + 10;
  for (const lines of [
    ['Tap Stencil in the toolbar:', 'the panel opens. Undo takes back', 'the last shape, Settings sets', 'hatch spacing and wrap padding.'],
    ['Basic shapes, flowchart symbols,', 'arrows and lines.'],
    ['Line: solid, dashed, dotted or none,', 'its weight and its grey.', 'Fill: none, solid, hatch or cross,', 'its tone, clean or hand-drawn.'],
    ['Tap a shape: the panel folds into', 'a strip and the page is yours.'],
  ]) {
    s += para(col, ty, lines);
    ty += lines.length * LEAD + LEAD / 2;
  }

  // 2. The strip across the page, the ink row open; three captions under its three parts.
  const sy = 1290;
  const sscale = 0.87;
  s += place(strip({ ...hand, fill: 'hatch', tone: 'light', ink: 'dark' }, 'process', { open: 'ink' }), { x: 48, y: 32 }, { x: LEFT, y: sy }, sscale);
  const cy = sy + 100 * 2 * sscale + 50;
  const small = 46;
  s += para(LEFT, cy, ['Pinned: ready as soon', 'as Stencil opens.', 'Tap it for the panel.'], 'start', small);
  s += para(LEFT + 600, cy, ['One chip per setting.', 'Tap it, pick a value,', 'the row closes.'], 'start', small);
  s += para(RIGHT, cy, ['Nothing is placed', 'until you tap the page;', '× closes without.'], 'end', small);

  // 3. Lasso, then tap Stencil: handwriting is wrapped, a stretched shape is redrawn. The writing is cut from the screenshot at page scale, so the scene is shrunk a little to leave the caption room.
  const word = inkBox('backOrder', LEFT + 70, 1830);
  const [wl, wt, wr, wb] = word;
  const loop = `<path d="M${wl - 50} ${wt + 10} C ${wl - 60} ${wt - 90}, ${wr + 40} ${wt - 100}, ${wr + 60} ${wt + 20} C ${wr + 80} ${wb + 70}, ${wl - 10} ${wb + 80}, ${wl - 40} ${wb + 20} C ${wl - 60} ${wb - 10}, ${wl - 60} ${wt + 30}, ${wl - 35} ${wt + 5}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="12 9"/>`;
  const wrappedAt = wr + 260;
  const wrapped = inkBox('backOrder', wrappedAt, wt);
  const mid = (wt + wb) / 2;
  let wrapScene = writing(shot, 'backOrder', wl, wt) + loop + arrow(wr + 100, mid, wrappedAt - 80, mid);
  wrapScene += writing(shot, 'backOrder', wrappedAt, wt) + shape('rounded', [wrapped[0] - 48, wrapped[1] - 40, wrapped[2] + 48, wrapped[3] + 40], 23, hand);
  s += place(wrapScene, { x: LEFT, y: wt - 60 }, { x: LEFT, y: wt - 60 }, 0.82);
  s += para(RIGHT, mid - LEAD - 20, ['Lasso handwriting, tap Stencil:', 'it is wrapped in the', 'shape you pick.'], 'end', small);

  const rt = 2080;
  const rx = LEFT + 20;
  const box0: [number, number, number, number] = [rx, rt, rx + 140, rt + 150];
  const stretched: [number, number, number, number] = [rx, rt, rx + 360, rt + 150];
  const sx = (stretched[2] - stretched[0]) / (box0[2] - box0[0]);
  // Lasso scaling stretches stroke width and bow with the shape; the redraw renders it fresh.
  s += `<g transform="translate(${stretched[0]} 0) scale(${sx} 1) translate(${-box0[0]} 0)">${shape('process', box0, 31, hand)}</g>` + selected(stretched, 16);
  const redrawnAt = stretched[2] + 200;
  const rmid = rt + 75;
  s += arrow(stretched[2] + 60, rmid, redrawnAt - 50, rmid);
  s += shape('process', [redrawnAt, rt, redrawnAt + 360, rt + 150], 31, hand);
  s += para(RIGHT, rmid - LEAD - 20, ['Lasso a shape, stretch it,', 'tap Stencil: it is', 'redrawn clean.'], 'end', small);

  return svg(s);
}

async function main() {
  for (const [family, file] of [[TITLE, 'BebasNeue-Bold.otf'], [BODY, 'Raleway-Regular.ttf']]) {
    const path = join(FONTS, file);
    if (!existsSync(path) || !GlobalFonts.registerFromPath(path, family)) {
      throw new Error(`Font missing: ${path} (copy it from the device's MyStyle/fonts)`);
    }
  }
  const diagram = join(DIR, 'raw', '01-diagram.png');
  const img = await loadImage(Buffer.from(page(readFileSync(diagram))));
  const canvas = createCanvas(1920, 2560);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  writeFileSync(OUT, canvas.toBuffer('image/png'));
  console.log(OUT);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
