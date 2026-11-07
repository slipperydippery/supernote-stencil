/// <reference types="node" />
/**
 * Builds the listing shots that a screenshot cannot catch: the firmware leaves
 * the plugin view out of its screenshots. Each scene is an SVG page (1920 x
 * 2560) on a real screenshot: the device sidebar and the handwriting are cut
 * from 01-diagram.png, the shapes come from the renderer, and only the
 * plugin's panel and strip are drawn here, from the sizes in src/ui.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderShape, type Plan } from '../src/render/plan';
import { DEFAULT_STYLE, STYLE_VALUES, type Style } from '../src/render/style';
import { SHAPES, shapesIn, type ShapeId } from '../src/shapes';

type B = [number, number, number, number]; // left, top, right, bottom

const ROOT = join(__dirname, '..');
/** dp → page px. Not measured on the Manta yet; compare the panel with the device. */
const R = 2;
const HAND: Style = { ...DEFAULT_STYLE, look: 'hand' };
const SANS = 'Noto Sans';

const f1 = (n: number) => Math.round(n * 10) / 10;
const dataUri = (buf: Buffer) => `data:image/png;base64,${buf.toString('base64')}`;
const asset = (p: string) => dataUri(readFileSync(join(ROOT, p)));
const grey = (c: number) => (c === 0 ? '#111' : `rgb(${c},${c},${c})`);

// --- shapes, from the renderer -----------------------------------------------

/** Pen 16 width share for a pressure: the measured curve in render/hand.ts, inverted. */
const CURVE: [number, number][] = [[400, 0.33], [800, 0.67], [1200, 0.83], [1600, 1]];
function widthShare(p: number): number {
  if (p <= CURVE[0][0]) {
    return CURVE[0][1];
  }
  for (let i = 1; i < CURVE.length; i++) {
    const [p0, a] = CURVE[i - 1];
    const [p1, b] = CURVE[i];
    if (p <= p1) {
      return a + ((p - p0) / (p1 - p0)) * (b - a);
    }
  }
  return 1;
}

/** A variable-width stroke as one filled outline. */
function ribbon(pts: { x: number; y: number }[], widths: number[]): string {
  const left: string[] = [];
  const right: string[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / d;
    const ny = (b.x - a.x) / d;
    const w = widths[i] / 2;
    left.push(`${f1(p.x + nx * w)},${f1(p.y + ny * w)}`);
    right.push(`${f1(p.x - nx * w)},${f1(p.y - ny * w)}`);
  });
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}

function planSvg(plan: Plan): string {
  let s = '';
  for (const g of plan.geometries) {
    const st = `fill="none" stroke="${grey(g.penColor)}" stroke-width="${f1(g.penWidth / 100)}" stroke-linejoin="round" stroke-linecap="round"`;
    if (g.type === 'GEO_ellipse' && g.ellipseCenterPoint) {
      s += `<ellipse cx="${f1(g.ellipseCenterPoint.x)}" cy="${f1(g.ellipseCenterPoint.y)}" rx="${f1(g.ellipseMajorAxisRadius)}" ry="${f1(g.ellipseMinorAxisRadius)}" ${st}/>`;
    } else {
      const pts = g.points.map(p => `${f1(p.x)},${f1(p.y)}`).join(' ');
      s += g.type === 'GEO_polygon' ? `<polygon points="${pts}" ${st}/>` : `<polyline points="${pts}" ${st}/>`;
    }
  }
  for (const k of plan.strokes) {
    const full = k.thickness / 100;
    if (k.penType === 16) {
      s += `<path d="${ribbon(k.points, k.pressures.map(p => Math.max(1.2, full * widthShare(p))))}" fill="${grey(k.penColor)}"/>`;
    } else {
      const pts = k.points.map(p => `${f1(p.x)},${f1(p.y)}`).join(' ');
      s += `<polyline points="${pts}" fill="none" stroke="${grey(k.penColor)}" stroke-width="${f1(Math.max(1.2, full))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  return s;
}

function shape(id: ShapeId, [left, top, right, bottom]: B, seed: number, style: Partial<Style> = {}): string {
  return planSvg(renderShape(SHAPES[id], { left, top, right, bottom }, { ...HAND, ...style }, seed));
}

// --- the screenshot: page, sidebar, handwriting ---------------------------------

/** Handwriting in 01-diagram.png, tight around the ink. */
const INK: Record<string, B> = {
  checkStock: [732, 793, 1134, 883],
  shipOrder: [751, 1741, 1116, 1849],
  backOrder: [1452, 1267, 1833, 1351],
};

function blankPage(shot: string): string {
  // Keep the sidebar and the footer, clear the page.
  return `<image href="${shot}" x="0" y="0" width="1920" height="2560"/><rect x="117" y="0" width="1803" height="2475" fill="#fff"/>`;
}

/** Cuts a word from the screenshot and sets its top-left at (x, y). */
function writing(shot: string, word: keyof typeof INK, x: number, y: number): string {
  const [l, t, r, b] = INK[word];
  return `<svg x="${x}" y="${y}" width="${r - l}" height="${b - t}" viewBox="${l} ${t} ${r - l} ${b - t}" style="mix-blend-mode:multiply"><image href="${shot}" x="0" y="0" width="1920" height="2560"/></svg>`;
}
function inkBox(word: keyof typeof INK, x: number, y: number): B {
  const [l, t, r, b] = INK[word];
  return [x, y, x + r - l, y + b - t];
}

// --- the plugin UI, from src/ui sizes in dp -------------------------------------

const GLYPH: Record<string, string> = {};
for (const g of Object.keys(STYLE_VALUES) as (keyof Style)[]) {
  for (const v of STYLE_VALUES[g]) {
    GLYPH[`${g}-${v}`] = asset(`assets/glyphs/${g}-${v}.png`);
  }
}
const PIN_ON = asset('assets/glyphs/pin-on.png');
const ICON = Object.fromEntries((Object.keys(SHAPES) as ShapeId[]).map(id => [id, asset(`assets/shapes/${id}.png`)]));

function label(x: number, y: number, text: string, size: number, opts: { weight?: number; fill?: string; anchor?: string } = {}): string {
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${opts.anchor ?? 'middle'}" dominant-baseline="central" font-family="${SANS}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? '#000'}">${text}</text>`;
}
function box(x: number, y: number, w: number, h: number, r: number, stroke: string, sw: number, fill = '#fff'): string {
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

/** Style chips in a row (StyleBar): returns the markup and the row's width. */
function chips(groups: (keyof Style)[], style: Style, x: number, y: number, cw: number, ch: number, groupGap: number): { svg: string; w: number } {
  let s = '';
  let cx = x;
  groups.forEach((g, gi) => {
    cx += gi ? groupGap : 0;
    const off = g === 'tone' && style.fill === 'none';
    for (const v of STYLE_VALUES[g]) {
      const on = style[g] === v;
      s += `<g opacity="${off ? 0.3 : 1}">${box(cx, y, cw + 4 * R, ch + 4 * R, 3 * R, on ? '#000' : '#777', on ? 2 * R : R)}`;
      s += `<image href="${GLYPH[`${g}-${v}`]}" x="${cx + 2 * R}" y="${y + 2 * R}" width="${cw}" height="${ch}"/></g>`;
      cx += cw + 4 * R + 3 * R;
    }
    cx -= 3 * R;
  });
  return { svg: s, w: cx - x };
}

function panel(style: Style, selected: ShapeId): string {
  const x = 70 * R;
  const y = 40 * R;
  const w = 420 * R;
  const pad = 14 * R;
  const gap = 12 * R;
  let s = '';
  let cy = y + pad;
  const btn = 36 * R;
  s += label(x + pad, cy + btn / 2, 'Stencil', 22 * R, { weight: 600, anchor: 'start' });
  const closeX = x + w - pad - btn;
  const settingsW = 95 * R;
  s += box(closeX - 8 * R - settingsW, cy, settingsW, btn, 4 * R, '#000', R) + label(closeX - 8 * R - settingsW / 2, cy + btn / 2, 'Settings', 16 * R);
  s += box(closeX, cy, btn, btn, 4 * R, '#000', R) + label(closeX + btn / 2, cy + btn / 2, '×', 22 * R);
  cy += btn + gap;

  const tabH = 40 * R;
  const tw = (w - 2 * pad) / 3;
  ['Basic', 'Flow', 'Arrows'].forEach((t, i) => {
    const on = t === 'Flow';
    s += label(x + pad + tw * i + tw / 2, cy + tabH / 2 - R, t, 16 * R, { weight: on ? 600 : 400, fill: on ? '#000' : '#777' });
    if (on) {
      s += `<rect x="${x + pad + tw * i}" y="${cy + tabH - 3 * R}" width="${tw}" height="${3 * R}" fill="#000"/>`;
    }
  });
  s += `<rect x="${x + pad}" y="${cy + tabH}" width="${w - 2 * pad}" height="${R}" fill="#000"/>`;
  cy += tabH + R + gap;

  const cw = 34 * R;
  const ch = 27 * R;
  for (const row of [['weight', 'line', 'look'], ['fill', 'tone']] as (keyof Style)[][]) {
    const rowW = chips(row, style, 0, 0, cw, ch, 24 * R).w;
    s += chips(row, style, x + (w - rowW) / 2, cy, cw, ch, 24 * R).svg;
    cy += ch + 4 * R + 6 * R;
  }
  cy += gap - 6 * R;

  const cellW = (420 - 2 * 14 - 2 - 8) / 2 * R;
  const cellH = (8 + 72 + 4 + 20 + 8) * R;
  shapesIn('flow').forEach((d, i) => {
    const cx = x + pad + (i % 2) * (cellW + 8 * R);
    const ry = cy + Math.floor(i / 2) * (cellH + 8 * R);
    const on = d.id === selected;
    s += box(cx, ry, cellW, cellH, 6 * R, on ? '#000' : '#777', on ? 3 * R : R);
    s += `<image href="${ICON[d.id]}" x="${cx + cellW / 2 - 36 * R}" y="${ry + 8 * R}" width="${72 * R}" height="${72 * R}"/>`;
    s += label(cx + cellW / 2, ry + (8 + 72 + 4 + 10) * R, d.label, 14 * R);
  });
  const bottom = cy + 4 * cellH + 3 * 8 * R + pad;
  return box(x, y, w, bottom - y, 8 * R, '#000', R) + s;
}

function strip(style: Style, id: ShapeId, action?: string): string {
  const x = 24 * R;
  const y = 16 * R;
  const w = 1920 - 2 * x;
  const h = 64 * R;
  let s = box(x, y, w, h, 6 * R, '#000', R);
  const px = x + 8 * R;
  // The shape tile: preview alone on the redraw strip, preview plus a pinned pin tab (2 dp ink frame) on the place strip.
  const pinned = !action;
  const tileW = (pinned ? 101 : 64) * R;
  const ty = y + 7 * R;
  s += box(px, ty, tileW, 50 * R, 4 * R, pinned ? '#000' : '#777', pinned ? 2 * R : R) + `<image href="${ICON[id]}" x="${px + 10 * R}" y="${y + 10 * R}" width="${44 * R}" height="${44 * R}"/>`;
  if (pinned) {
    const tx = px + tileW - 36 * R;
    s += `<clipPath id="tile"><rect x="${f1(px)}" y="${f1(ty)}" width="${f1(tileW)}" height="${50 * R}" rx="${4 * R}"/></clipPath>`;
    s += `<rect x="${f1(tx)}" y="${f1(ty)}" width="${36 * R}" height="${50 * R}" fill="#000" clip-path="url(#tile)"/>`;
    s += `<image href="${PIN_ON}" x="${f1(tx + 18 * R - 12 * R)}" y="${f1(ty + 25 * R - 12 * R)}" width="${24 * R}" height="${24 * R}"/>`;
  }
  s += chips(['weight', 'line', 'fill', 'tone', 'look'], style, px + tileW + 10 * R, y + (h - 28 * R) / 2, 32 * R, 24 * R, 10 * R).svg;
  // The redraw strip: bin, check, close. The place strip: close only.
  const marks = action ? ['bin', action, '×'] : ['×'];
  const mark = 40 * R;
  marks.forEach((m, i) => {
    const mx = x + w - 8 * R - mark - (marks.length - 1 - i) * (mark + 10 * R);
    const my = y + (h - mark) / 2;
    const dark = m !== '×' && m !== 'bin';
    s += box(mx, my, mark, mark, 4 * R, '#000', R, dark ? '#000' : '#fff');
    const c = { x: mx + mark / 2, y: my + mark / 2 };
    if (m === 'bin') {
      s += `<path transform="translate(${f1(c.x - 12 * R)} ${f1(c.y - 12 * R)}) scale(${R})" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#000"/>`;
    } else if (m === 'check') {
      s += `<path d="M${c.x - 9 * R} ${c.y} l${6 * R} ${7 * R} l${12 * R} ${-14 * R}" fill="none" stroke="#fff" stroke-width="${3 * R}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      s += label(c.x, c.y, m, 22 * R);
    }
  });
  return s;
}

/** The selection frame left after an insert or a lasso. */
function selected([l, t, r, b]: B, pad = 20): string {
  [l, t, r, b] = [l - pad, t - pad, r + pad, b + pad];
  let s = `<rect x="${l}" y="${t}" width="${r - l}" height="${b - t}" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="14 10"/>`;
  for (const [hx, hy] of [[l, t], [r, t], [l, b], [r, b]]) {
    s += `<rect x="${hx - 10}" y="${hy - 10}" width="20" height="20" fill="#fff" stroke="#000" stroke-width="3"/>`;
  }
  return s;
}

// --- scenes ---------------------------------------------------------------------

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="2560" viewBox="0 0 1920 2560">${body}</svg>`;

export function scenes(diagramShot: Buffer): Record<string, string> {
  const shot = dataUri(diagramShot);
  const page = blankPage(shot);

  const panelStyle: Style = { ...HAND, fill: 'hatch', tone: 'light' };

  // Place: drag a box around a written label.
  const word = inkBox('checkStock', 760, 560);
  const drag: B = [word[0] - 70, word[1] - 70, word[2] + 70, word[3] + 70];
  const pen = `<circle cx="${drag[2]}" cy="${drag[3]}" r="14" fill="#000"/><circle cx="${drag[2]}" cy="${drag[3]}" r="32" fill="none" stroke="#000" stroke-width="3"/>`;

  // Wrap: lasso a label, wrap it with the default 2 mm padding.
  const wrapWord = inkBox('backOrder', 770, 1090);
  const [wl, wt, wr, wb] = wrapWord;
  const loop = `<path d="M${wl - 50} ${wt + 10} C ${wl - 60} ${wt - 90}, ${wr + 40} ${wt - 100}, ${wr + 60} ${wt + 20} C ${wr + 80} ${wb + 70}, ${wl - 10} ${wb + 80}, ${wl - 40} ${wb + 20} C ${wl - 60} ${wb - 10}, ${wl - 60} ${wt + 30}, ${wl - 35} ${wt + 5}" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="12 9"/>`;
  const wrapped: B = [wl - 48, wt - 40, wr + 48, wb + 40];

  // Redraw: a box stretched by the native lasso to fit its label, then redrawn.
  const label2 = inkBox('shipOrder', 800, 560);
  const stretched: B = [label2[0] - 60, label2[1] - 50, label2[2] + 60, label2[3] + 50];
  const small: B = [stretched[0], stretched[1], stretched[0] + 140, stretched[3]];
  const sx = (stretched[2] - stretched[0]) / (small[2] - small[0]);
  // Lasso scaling stretches stroke width and bow with the shape.
  const degraded = `<g transform="translate(${stretched[0]} 0) scale(${sx} 1) translate(${-small[0]} 0)">${shape('process', small, 31)}</g>`;

  return {
    panel: svg(page + panel(panelStyle, 'decision')),
    placeDrag: svg(page + writing(shot, 'checkStock', word[0], word[1]) + strip(HAND, 'process') +
      `<rect x="${drag[0]}" y="${drag[1]}" width="${drag[2] - drag[0]}" height="${drag[3] - drag[1]}" fill="none" stroke="#000" stroke-width="4"/>` + pen),
    placeDone: svg(page + writing(shot, 'checkStock', word[0], word[1]) + shape('process', drag, 17)),
    wrapBefore: svg(page + writing(shot, 'backOrder', wl, wt) + loop),
    wrapAfter: svg(page + writing(shot, 'backOrder', wl, wt) + shape('rounded', wrapped, 23)),
    redrawBefore: svg(page + degraded + writing(shot, 'shipOrder', label2[0], label2[1]) + selected(stretched) + strip(HAND, 'process', 'check')),
    redrawAfter: svg(page + shape('process', stretched, 31) + writing(shot, 'shipOrder', label2[0], label2[1])),
  };
}
