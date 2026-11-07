import { dashLengths } from '../src/render/dashes';
import { peakThickness, splitStrokes, toXY } from '../src/render/hand';
import { renderShape, type Plan } from '../src/render/plan';
import { DEFAULT_STYLE, FILLS, LINES, LOOKS, WEIGHTS, firmwareWidth, type Style } from '../src/render/style';
import { SHAPES, type ShapeDef } from '../src/shapes';
import { ALL_IDS, defaultBox, inside } from '../test/helpers';

const STYLES: Style[] = LOOKS.flatMap(look =>
  LINES.flatMap(line => FILLS.flatMap(fill => WEIGHTS.map(weight => ({ weight, line, fill, look })))),
);

/** A bare 2-point open outline, for exercising the dash renderer's degenerate-end
 * handling directly. `id` only matters for plan.ts's ellipse check, irrelevant here. */
const OPEN_LINE: ShapeDef = {
  id: 'arrow', family: 'arrow', label: 'open line (test fixture)', closed: false,
  defaultSize: { w: 0, h: 0 }, keepAspect: false,
  outline: box => [[{ x: box.left, y: box.top }, { x: box.right, y: box.bottom }]],
};

function allPoints(plan: Plan) {
  return [...plan.strokes.flatMap(s => s.points), ...plan.geometries.flatMap(g => g.points)];
}

const style = (s: Partial<Style>): Style => ({ ...DEFAULT_STYLE, ...s });

describe('renderShape', () => {
  describe.each(ALL_IDS)('%s', id => {
    const def = SHAPES[id];
    const box = defaultBox(def);
    // Arrow heads spread sideways from the shaft by about half their length, past a degenerate box.
    const headSpread = def.family === 'arrow' ? 0.6 * Math.max(24, 0.09 * Math.max(def.defaultSize.w, def.defaultSize.h)) : 0;
    const grow = 10 + headSpread;

    it('renders in every style within the grown box', () => {
      for (const st of STYLES) {
        const plan = renderShape(def, box, st, 7);
        expect(plan.strokes.length + plan.geometries.length).toBeGreaterThan(0);
        for (const p of allPoints(plan)) {
          if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) {
            throw new Error(`non-finite point in ${id} ${JSON.stringify(st)}`);
          }
          if (p.x < box.left - grow || p.x > box.right + grow || p.y < box.top - grow || p.y > box.bottom + grow) {
            throw new Error(`point ${p.x},${p.y} outside ${id} ${JSON.stringify(st)}`);
          }
          if (p.x < plan.bounds.left || p.x > plan.bounds.right || p.y < plan.bounds.top || p.y > plan.bounds.bottom) {
            throw new Error(`point outside bounds in ${id} ${JSON.stringify(st)}`);
          }
        }
        for (const s of plan.strokes) {
          expect(s.pressures).toHaveLength(s.points.length);
          expect(Number.isInteger(s.thickness)).toBe(false);
          expect(s.penType === 16 ? st.look === 'hand' : true).toBe(true);
        }
        for (const g of plan.geometries) {
          expect(Number.isInteger(g.penWidth)).toBe(false);
          expect(g.points.length).toBeLessThan(200);
        }
      }
    });
  });

  it('draws a clean solid rectangle as one closed polygon', () => {
    const plan = renderShape(SHAPES.rectangle, defaultBox(SHAPES.rectangle), DEFAULT_STYLE, 1);
    expect(plan.strokes).toHaveLength(0);
    expect(plan.geometries).toHaveLength(1);
    const [g] = plan.geometries;
    expect(g.type).toBe('GEO_polygon');
    expect(g.points).toHaveLength(5);
    expect(g.points[4]).toEqual(g.points[0]);
    expect(g.penWidth).toBe(600.001);
  });

  it('draws a clean solid circle as an ellipse with equal radii', () => {
    const box = defaultBox(SHAPES.circle);
    const [g, ...rest] = renderShape(SHAPES.circle, box, DEFAULT_STYLE, 1).geometries;
    expect(rest).toHaveLength(0);
    expect(g.type).toBe('GEO_ellipse');
    expect(g.ellipseMajorAxisRadius).toBe(150);
    expect(g.ellipseMinorAxisRadius).toBe(150);
    expect(g.ellipseCenterPoint).toEqual({ x: 250, y: 250 });
    expect(g.ellipseAngle).toBe(0);
  });

  it('draws clean open shapes as a straightLine shaft and closed heads', () => {
    const plan = renderShape(SHAPES.doubleArrow, defaultBox(SHAPES.doubleArrow), DEFAULT_STYLE, 1);
    expect(plan.geometries.map(g => g.type)).toEqual(['straightLine', 'GEO_polygon', 'GEO_polygon']);
    const head = plan.geometries[1].points;
    expect(head).toHaveLength(4);
    expect(head[3]).toEqual(head[0]);
  });

  it.each(LOOKS)('fills every arrow head solid black inside the head (%s)', look => {
    for (const def of ALL_IDS.map(id => SHAPES[id]).filter(d => d.family === 'arrow')) {
      const box = defaultBox(def);
      const heads = def.outline(box).slice(1).map(h => [...h, h[0]]);
      const fills = renderShape(def, box, style({ look }), 1).strokes.filter(s => s.penType === 10);
      expect(fills.length).toBeGreaterThanOrEqual(heads.length * 3);
      for (const s of fills) {
        expect(s.penColor).toBe(0);
        for (const p of s.points) {
          expect(heads.some(h => inside(h, p))).toBe(true);
        }
      }
    }
  });

  it('leaves the shape fill style off arrows: only the heads are filled', () => {
    const def = SHAPES.arrow;
    const plain = renderShape(def, defaultBox(def), DEFAULT_STYLE, 1);
    const dark = renderShape(def, defaultBox(def), style({ fill: 'dark' }), 1);
    expect(dark.strokes).toEqual(plain.strokes);
  });

  it('draws a long hand-drawn arrow shaft in one pass per corner-to-corner run', () => {
    const box = { left: 0, top: 900, right: 900, bottom: 0 };
    // Each head is two barb strokes, split at its tip.
    const pens = (def: ShapeDef) => renderShape(def, box, style({ look: 'hand' }), 5).strokes.filter(s => s.penType === 16).length;
    expect(pens(SHAPES.archArrow)).toBe(1 + 2);
    expect(pens(SHAPES.scoopArrow)).toBe(1 + 2);
    expect(pens(SHAPES.arrow)).toBe(1 + 2);
    expect(pens(SHAPES.elbowArrow)).toBe(3 + 2);
  });

  it('draws a hand-drawn rectangle as four pen strokes, one per side', () => {
    const box = defaultBox(SHAPES.rectangle);
    const plan = renderShape(SHAPES.rectangle, box, style({ look: 'hand' }), 3);
    expect(plan.geometries).toHaveLength(0);
    expect(plan.strokes).toHaveLength(4);
    const side = (p: { x: number; y: number }) =>
      [Math.abs(p.y - box.top), Math.abs(p.x - box.right), Math.abs(p.y - box.bottom), Math.abs(p.x - box.left)].indexOf(
        Math.min(Math.abs(p.y - box.top), Math.abs(p.x - box.right), Math.abs(p.y - box.bottom), Math.abs(p.x - box.left)),
      );
    for (const s of plan.strokes) {
      expect(s.penType).toBe(16);
      expect(s.thickness).toBe(firmwareWidth(peakThickness(600, 0.4)));
      for (const pr of s.pressures) {
        expect(pr).toBeGreaterThanOrEqual(400);
        expect(pr).toBeLessThanOrEqual(1600);
      }
      // Interior samples sit on one side (the ends overshoot past the corner).
      const mid = s.points.slice(3, -3).map(side);
      expect(new Set(mid).size).toBe(1);
    }
  });

  it('draws the smooth outline of a hand-drawn rounded rectangle in one pass at any size', () => {
    const box = defaultBox(SHAPES.rounded);
    // No corner is sharper than 35°, so the whole outline is one run.
    expect(splitStrokes(toXY(SHAPES.rounded.outline(box)[0]), true)).toHaveLength(1);
    expect(renderShape(SHAPES.rounded, box, style({ look: 'hand' }), 3).strokes).toHaveLength(1);
    const big = { left: 0, top: 0, right: 1600, bottom: 800 };
    expect(renderShape(SHAPES.rounded, big, style({ look: 'hand' }), 3).strokes).toHaveLength(1);
  });

  it('draws a hand-drawn circle in one stroke', () => {
    expect(renderShape(SHAPES.circle, defaultBox(SHAPES.circle), style({ look: 'hand' }), 3).strokes).toHaveLength(1);
  });

  it('dashes a clean rectangle in separate strokes that never cross a corner', () => {
    const box = defaultBox(SHAPES.rectangle);
    const plan = renderShape(SHAPES.rectangle, box, style({ line: 'dashed' }), 1);
    const { on } = dashLengths(600);
    expect(plan.geometries).toHaveLength(0);
    expect(plan.strokes.length).toBeGreaterThan(8);
    for (const s of plan.strokes) {
      expect(s.penType).toBe(10);
      expect(s.pressures.every(p => p === 2000)).toBe(true);
      let len = 0;
      for (let i = 1; i < s.points.length; i++) {
        len += Math.hypot(s.points[i].x - s.points[i - 1].x, s.points[i].y - s.points[i - 1].y);
      }
      expect(len).toBeLessThan(on + 4);
      const horizontal = s.points.every(p => p.y === s.points[0].y);
      const vertical = s.points.every(p => p.x === s.points[0].x);
      expect(horizontal || vertical).toBe(true);
    }
  });

  it('dots as two-point strokes 1 px long', () => {
    const plan = renderShape(SHAPES.circle, defaultBox(SHAPES.circle), style({ line: 'dotted' }), 1);
    expect(plan.strokes.length).toBeGreaterThan(10);
    for (const s of plan.strokes) {
      expect(s.points).toHaveLength(2);
      expect(Math.hypot(s.points[1].x - s.points[0].x, s.points[1].y - s.points[0].y)).toBeCloseTo(1, 6);
    }
  });

  it.each(['clean', 'hand'] as const)('never doubles a dot on a %s rectangle corner', look => {
    // 300 px sides are an exact multiple of the 15.6 px dot gap only by accident; check every pair.
    for (const w of [300, 312, 468]) {
      const plan = renderShape(SHAPES.rectangle, { left: 0, top: 0, right: w, bottom: 156 }, style({ line: 'dotted', look }), 2);
      const pts = plan.strokes.map(s => s.points[0]);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(4);
        }
      }
    }
  });

  it('keeps a dot on the open end of a dotted line', () => {
    const { dot } = dashLengths(600);
    // Exactly one gap long: without keepEnd the dot at the far end would be dropped as a corner duplicate.
    const plan = renderShape(OPEN_LINE, { left: 0, top: 0, right: 16, bottom: 0 }, style({ line: 'dotted' }), 1);
    expect(dot).toBeLessThan(16);
    expect(plan.strokes).toHaveLength(2);
  });

  it('gives each arrow head its own random sequence', () => {
    const def = SHAPES.doubleArrow;
    const plan = renderShape(def, defaultBox(def), style({ look: 'hand' }), 4);
    const [, right, left] = def.outline(defaultBox(def));
    const offsets = (head: { x: number; y: number }[]) =>
      plan.strokes
        .find(s => s.penType === 16 && Math.abs(s.points[Math.floor(s.points.length / 2)].x - head[1].x) < 30)!
        .pressures.slice(0, 5);
    expect(offsets(right)).not.toEqual(offsets(left));
  });

  it.each(['light', 'dark', 'hatch'] as const)('clips the %s fill to the diamond and draws it first', fill => {
    const def = SHAPES.diamond;
    const plan = renderShape(def, defaultBox(def), style({ fill }), 1);
    const poly = def.outline(defaultBox(def))[0];
    const fills = plan.strokes;
    expect(fills.length).toBeGreaterThan(5);
    for (const s of fills) {
      expect(s.penType).toBe(10);
      expect(s.penColor).toBe(fill === 'light' ? 201 : fill === 'dark' ? 157 : 0);
      for (const p of s.points) {
        expect(inside(poly, p)).toBe(true);
      }
    }
    expect(plan.geometries).toHaveLength(1);
  });

  it('emits fill strokes before outline strokes', () => {
    const plan = renderShape(SHAPES.rectangle, defaultBox(SHAPES.rectangle), style({ fill: 'dark', look: 'hand' }), 1);
    const firstPen16 = plan.strokes.findIndex(s => s.penType === 16);
    expect(firstPen16).toBeGreaterThan(0);
    expect(plan.strokes.slice(firstPen16).every(s => s.penType === 16)).toBe(true);
  });

  it('is deterministic, and the seed changes the hand-drawn output', () => {
    const def = SHAPES.storedData;
    const box = defaultBox(def);
    const st = style({ look: 'hand', fill: 'hatch', line: 'dashed' });
    expect(renderShape(def, box, st, 11)).toEqual(renderShape(def, box, st, 11));
    expect(renderShape(def, box, st, 12)).not.toEqual(renderShape(def, box, st, 11));
  });
});
