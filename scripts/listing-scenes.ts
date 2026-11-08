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
import { FAMILIES, SHAPES, shapesIn, type Family, type ShapeId } from '../src/shapes';
import { groupDisabled } from '../src/ui/styleRules';

type B = [number, number, number, number]; // left, top, right, bottom

const ROOT = join(__dirname, '..');
/** dp → page px. Not measured on the Manta yet; compare the panel with the device. */
const R = 2;
const HAND: Style = { ...DEFAULT_STYLE, look: 'hand' };
const SANS = 'Noto Sans';

const f1 = (n: number) => Math.round(n * 10) / 10;
export const dataUri = (buf: Buffer) => `data:image/png;base64,${buf.toString('base64')}`;
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

export function shape(id: ShapeId, [left, top, right, bottom]: B, seed: number, style: Partial<Style> = {}): string {
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
export function writing(shot: string, word: keyof typeof INK, x: number, y: number): string {
  const [l, t, r, b] = INK[word];
  return `<svg x="${x}" y="${y}" width="${r - l}" height="${b - t}" viewBox="${l} ${t} ${r - l} ${b - t}" style="mix-blend-mode:multiply"><image href="${shot}" x="0" y="0" width="1920" height="2560"/></svg>`;
}
export function inkBox(word: keyof typeof INK, x: number, y: number): B {
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
export const ICON = Object.fromEntries((Object.keys(SHAPES) as ShapeId[]).map(id => [id, asset(`assets/shapes/${id}.png`)]));

export function label(x: number, y: number, text: string, size: number, opts: { weight?: number; fill?: string; anchor?: string } = {}): string {
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${opts.anchor ?? 'middle'}" dominant-baseline="central" font-family="${SANS}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? '#000'}">${text}</text>`;
}
export function box(x: number, y: number, w: number, h: number, r: number, stroke: string, sw: number, fill = '#fff'): string {
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

/** One Chip: the glyph plus 2 dp padding and 1 dp border a side; an `on` chip trades padding for a 2 dp ink border. */
function chip(x: number, y: number, glyph: string, cw: number, ch: number, on: boolean, off: boolean): string {
  return `<g opacity="${off ? 0.3 : 1}">${box(x, y, cw + 6 * R, ch + 6 * R, 3 * R, on ? '#000' : '#777', on ? 2 * R : R)}<image href="${glyph}" x="${x + 3 * R}" y="${y + 3 * R}" width="${cw}" height="${ch}"/></g>`;
}

/** Every value of each group in a row (StyleBar): returns the markup and the row's width. */
function chips(groups: (keyof Style)[], style: Style, x: number, y: number, cw: number, ch: number, groupGap: number): { svg: string; w: number } {
  let s = '';
  let cx = x;
  groups.forEach((g, gi) => {
    cx += gi ? groupGap : 0;
    const off = groupDisabled(g, style);
    for (const v of STYLE_VALUES[g]) {
      s += chip(cx, y, GLYPH[`${g}-${v}`], cw, ch, style[g] === v, off);
      cx += cw + 6 * R + 3 * R;
    }
    cx -= 3 * R;
  });
  return { svg: s, w: cx - x };
}

const TAB_LABEL: Record<Family, string> = { basic: 'Basic', flow: 'Flow', arrow: 'Arrows' };
/** Row 1 is the line, row 2 the fill (StyleBar.PANEL_ROWS). */
const PANEL_ROWS: (keyof Style)[][] = [['line', 'weight', 'ink'], ['fill', 'tone', 'look']];
/** Strip display order (StyleSummary.ORDER). */
const SUMMARY: (keyof Style)[] = ['weight', 'line', 'ink', 'fill', 'tone', 'look'];

/** A text button of the panel header: 16 dp text in 12 dp of padding; the width is an estimate of the text run. */
function textButton(right: number, y: number, text: string): { svg: string; w: number } {
  const w = (text.length * 8.4 + 24) * R;
  const h = 36 * R;
  return { svg: box(right - w, y, w, h, 4 * R, '#000', R) + label(right - w / 2, y + h / 2, text, 16 * R), w };
}

/** The panel (src/ui/Panel.tsx): header, tabs, the line and fill rows, the family's grid. */
export function panel(style: Style, selected: ShapeId | null, tab: Family = 'flow', undo = true): string {
  const x = 70 * R;
  const y = 40 * R;
  const w = 480 * R;
  const pad = 14 * R;
  const gap = 12 * R;
  let s = '';
  let cy = y + pad;
  const btn = 36 * R;
  s += label(x + pad, cy + btn / 2, 'Stencil', 22 * R, { weight: 600, anchor: 'start' });
  // Header buttons, right to left: close, Settings, Undo last.
  let right = x + w - pad;
  s += box(right - btn, cy, btn, btn, 4 * R, '#000', R) + label(right - btn / 2, cy + btn / 2, '×', 22 * R);
  right -= btn + 8 * R;
  for (const t of undo ? ['Settings', 'Undo last'] : ['Settings']) {
    const b = textButton(right, cy, t);
    s += b.svg;
    right -= b.w + 8 * R;
  }
  cy += btn + gap;

  const tabH = 40 * R;
  const tw = (w - 2 * pad) / FAMILIES.length;
  FAMILIES.forEach((f, i) => {
    const on = f === tab;
    s += label(x + pad + tw * i + tw / 2, cy + tabH / 2 - R, TAB_LABEL[f], 16 * R, { weight: on ? 600 : 400, fill: on ? '#000' : '#777' });
    if (on) {
      s += `<rect x="${x + pad + tw * i}" y="${cy + tabH - 3 * R}" width="${tw}" height="${3 * R}" fill="#000"/>`;
    }
  });
  s += `<rect x="${x + pad}" y="${cy + tabH}" width="${w - 2 * pad}" height="${R}" fill="#000"/>`;
  cy += tabH + R + gap;

  const cw = 32 * R;
  const ch = 24 * R;
  for (const row of PANEL_ROWS) {
    const rowW = chips(row, style, 0, 0, cw, ch, 16 * R).w;
    s += chips(row, style, x + (w - rowW) / 2, cy, cw, ch, 16 * R).svg;
    cy += ch + 6 * R + 6 * R;
  }
  cy += gap - 6 * R;

  const cellW = ((480 - 2 * 14 - 2 - 8) / 2) * R;
  const cellH = (8 + 72 + 4 + 20 + 8) * R;
  const defs = shapesIn(tab);
  defs.forEach((d, i) => {
    const cx = x + pad + (i % 2) * (cellW + 8 * R);
    const ry = cy + Math.floor(i / 2) * (cellH + 8 * R);
    const on = d.id === selected;
    s += box(cx, ry, cellW, cellH, 6 * R, on ? '#000' : '#777', on ? 3 * R : R);
    s += `<image href="${ICON[d.id]}" x="${cx + cellW / 2 - 36 * R}" y="${ry + 8 * R}" width="${72 * R}" height="${72 * R}"/>`;
    s += label(cx + cellW / 2, ry + (8 + 72 + 4 + 10) * R, d.label, 14 * R);
  });
  const rows = Math.ceil(defs.length / 2);
  const bottom = cy + rows * cellH + (rows - 1) * 8 * R + pad;
  return box(x, y, w, bottom - y, 8 * R, '#000', R) + s;
}

/** Outer size of a strip chip and the gap between summary chips (StyleSummary). */
const SUMMARY_CHIP = { w: 38 * R, h: 30 * R, gap: 10 * R };

/**
 * The strip (src/ui/Strip.tsx): the shape tile, six summary chips, the marks.
 * `action` draws the redraw strip (bin, check, close; no pin); `open` opens
 * that group's value row under the chips, which makes the strip taller.
 */
export function strip(style: Style, id: ShapeId, opts: { action?: boolean; open?: keyof Style } = {}): string {
  const x = 24 * R;
  const y = 16 * R;
  const w = 1920 - 2 * x;
  const tileH = 50 * R;
  const barTop = y + 7 * R + (tileH - SUMMARY_CHIP.h) / 2;
  const rowTop = barTop + SUMMARY_CHIP.h + 6 * R;
  const rowH = SUMMARY_CHIP.h + 10 * R;
  const h = opts.open ? rowTop + rowH - y + 7 * R : 64 * R;
  let s = box(x, y, w, h, 6 * R, '#000', R);
  const px = x + 8 * R;
  // The shape tile: preview alone on the redraw strip, preview plus a pinned pin tab (2 dp ink frame) on the place strip.
  const pinned = !opts.action;
  const tileW = (pinned ? 101 : 64) * R;
  const ty = y + 7 * R;
  s += box(px, ty, tileW, tileH, 4 * R, pinned ? '#000' : '#777', pinned ? 2 * R : R) + `<image href="${ICON[id]}" x="${px + 10 * R}" y="${y + 10 * R}" width="${44 * R}" height="${44 * R}"/>`;
  if (pinned) {
    const tx = px + tileW - 36 * R;
    s += `<clipPath id="tile"><rect x="${f1(px)}" y="${f1(ty)}" width="${f1(tileW)}" height="${tileH}" rx="${4 * R}"/></clipPath>`;
    s += `<rect x="${f1(tx)}" y="${f1(ty)}" width="${36 * R}" height="${tileH}" fill="#000" clip-path="url(#tile)"/>`;
    s += `<image href="${PIN_ON}" x="${f1(tx + 18 * R - 12 * R)}" y="${f1(ty + 25 * R - 12 * R)}" width="${24 * R}" height="${24 * R}"/>`;
  }
  // Six summary chips, each the glyph of its group's value with a corner mark; a dimmed group shows its value and does not open.
  const barX = px + tileW + 10 * R;
  SUMMARY.forEach((g, i) => {
    const cx = barX + i * (SUMMARY_CHIP.w + SUMMARY_CHIP.gap);
    const off = groupDisabled(g, style);
    s += chip(cx, barTop, GLYPH[`${g}-${style[g]}`], 32 * R, 24 * R, false, off);
    const mx = cx + SUMMARY_CHIP.w - 2 * R;
    const my = barTop + SUMMARY_CHIP.h - 2 * R;
    s += `<path d="M${f1(mx)} ${f1(my)} l${-4 * R} 0 l${4 * R} ${-4 * R} z" fill="#000" opacity="${off ? 0.3 : 1}"/>`;
  });
  if (opts.open) {
    const values = STYLE_VALUES[opts.open];
    const rowW = values.length * SUMMARY_CHIP.w + (values.length - 1) * 3 * R + 10 * R;
    const rx = barX + SUMMARY.indexOf(opts.open) * (SUMMARY_CHIP.w + SUMMARY_CHIP.gap);
    s += box(rx, rowTop, rowW, rowH, 4 * R, '#000', R);
    values.forEach((v, i) => {
      s += chip(rx + 5 * R + i * (SUMMARY_CHIP.w + 3 * R), rowTop + 5 * R, GLYPH[`${opts.open}-${v}`], 32 * R, 24 * R, style[opts.open!] === v, false);
    });
  }
  // The redraw strip: bin, check, close. The place strip: close only.
  const marks = opts.action ? ['bin', 'check', '×'] : ['×'];
  const mark = 40 * R;
  marks.forEach((m, i) => {
    const mx = x + w - 8 * R - mark - (marks.length - 1 - i) * (mark + 10 * R);
    const my = ty + (tileH - mark) / 2;
    const dark = m === 'check';
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
export function selected([l, t, r, b]: B, pad = 20): string {
  [l, t, r, b] = [l - pad, t - pad, r + pad, b + pad];
  let s = `<rect x="${l}" y="${t}" width="${r - l}" height="${b - t}" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="14 10"/>`;
  for (const [hx, hy] of [[l, t], [r, t], [l, b], [r, b]]) {
    s += `<rect x="${hx - 10}" y="${hy - 10}" width="20" height="20" fill="#fff" stroke="#000" stroke-width="3"/>`;
  }
  return s;
}

// --- scenes ---------------------------------------------------------------------

export const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="2560" viewBox="0 0 1920 2560">${body}</svg>`;

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
    redrawBefore: svg(page + degraded + writing(shot, 'shipOrder', label2[0], label2[1]) + selected(stretched) + strip(HAND, 'process', { action: true })),
    redrawAfter: svg(page + shape('process', stretched, 31) + writing(shot, 'shipOrder', label2[0], label2[1])),
  };
}
