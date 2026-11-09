import { renderShape } from '../src/render/plan';
import { DEFAULT_STYLE, WEIGHT_WIDTH, WEIGHTS, widthPx } from '../src/render/style';
import { SHAPES, type Box } from '../src/shapes';
import { headLength, NORMAL_LINE } from '../src/shapes/geom';
import { defaultBoxAt, fitBox, flipFor, MIN_SIDE, toPagePx } from '../src/ui/placement';
import { applyFlip, redrawBox } from '../src/ui/redraw';

const ctx = { notePath: '/n', page: 0, width: 1920, height: 2560, unit: 1 };
const point = (x: number, y: number) => ({ left: x, top: y, right: x, bottom: y });

describe('toPagePx', () => {
  it('multiplies by the pixel ratio and adds no offset', () => {
    expect(toPagePx({ x: 300, y: 400 }, 2)).toEqual({ x: 600, y: 800 });
  });
});

describe('defaultBoxAt', () => {
  it('centres the default size × unit on the point', () => {
    expect(defaultBoxAt(SHAPES.rectangle, point(600, 800), { ...ctx, unit: 0.5 })).toEqual({ left: 480, top: 740, right: 720, bottom: 860 });
  });

  it('clamps a shape near the page edge inside the page', () => {
    expect(defaultBoxAt(SHAPES.rectangle, point(10, 2550), ctx)).toEqual({ left: 0, top: 2320, right: 480, bottom: 2560 });
    expect(defaultBoxAt(SHAPES.rectangle, point(1915, 5), ctx)).toEqual({ left: 1440, top: 0, right: 1920, bottom: 240 });
  });

  it('swaps top and bottom for rising shapes, so a tap places them bottom-left to top-right', () => {
    for (const def of [SHAPES.archArrow, SHAPES.scoopArrow]) {
      expect(defaultBoxAt(def, point(600, 800), ctx)).toEqual({ left: 360, top: 920, right: 840, bottom: 680 });
      const shaft = renderShape(def, defaultBoxAt(def, point(600, 800), ctx), DEFAULT_STYLE, 1).geometries[0].points;
      expect(shaft[0]).toEqual({ x: 360, y: 920 });
      expect(shaft[shaft.length - 1]).toEqual({ x: 840, y: 680 });
    }
  });
});

describe('fitBox', () => {
  it('normalises reversed corners', () => {
    expect(fitBox(SHAPES.rectangle, { left: 800, top: 500, right: 200, bottom: 200 })).toEqual({ left: 200, top: 200, right: 800, bottom: 500 });
  });

  it('reduces keepAspect shapes to the shorter side, centred', () => {
    expect(fitBox(SHAPES.square, { left: 200, top: 200, right: 800, bottom: 500 })).toEqual({ left: 350, top: 200, right: 650, bottom: 500 });
  });

  it('grows a thin closed shape to the minimum side', () => {
    const b = fitBox(SHAPES.rectangle, { left: 100, top: 100, right: 400, bottom: 110 });
    expect(b.bottom - b.top).toBe(MIN_SIDE);
    expect((b.top + b.bottom) / 2).toBe(105);
  });

  it('keeps the exact swept box for arrows, with the drag direction', () => {
    const dragLeft = { left: 800, top: 300, right: 200, bottom: 304 };
    expect(fitBox(SHAPES.arrow, dragLeft)).toEqual({ left: 800, top: 300, right: 200, bottom: 304 });
    expect(fitBox(SHAPES.doubleArrow, dragLeft)).toEqual(dragLeft);
    expect(fitBox(SHAPES.line, dragLeft)).toEqual(dragLeft);
  });

  it('runs line, arrow and double arrow straight from pen-down to pen-up, in every direction', () => {
    const drags = [
      { left: 200, top: 300, right: 800, bottom: 300 },
      { left: 800, top: 300, right: 200, bottom: 300 },
      { left: 300, top: 200, right: 300, bottom: 800 },
      { left: 300, top: 800, right: 300, bottom: 200 },
      { left: 200, top: 300, right: 800, bottom: 600 },
      { left: 800, top: 600, right: 200, bottom: 300 },
      { left: 200, top: 600, right: 800, bottom: 300 },
    ];
    for (const def of [SHAPES.line, SHAPES.arrow, SHAPES.doubleArrow]) {
      for (const d of drags) {
        const shaft = renderShape(def, fitBox(def, d), DEFAULT_STYLE, 1).geometries[0].points;
        expect([def.id, shaft[0], shaft[shaft.length - 1]]).toEqual([def.id, { x: d.left, y: d.top }, { x: d.right, y: d.bottom }]);
      }
    }
  });

  it('a diagonal arrow head sits on the shaft line and is sized from the line width', () => {
    const d = { left: 200, top: 200, right: 800, bottom: 800 };
    const [shaft, head] = SHAPES.arrow.outline(fitBox(SHAPES.arrow, d));
    const [b1, tip, b2] = head;
    expect(tip).toEqual(shaft[1]);
    // The barbs are mirror images about the 45° shaft: their midpoint lies on it.
    expect((b1.x + b2.x) / 2).toBeCloseTo((b1.y + b2.y) / 2, 6);
    expect(Math.hypot(b1.x - tip.x, b1.y - tip.y)).toBeCloseTo(headLength(NORMAL_LINE), 6);
  });

  it('sizes heads by weight, not by length, and caps them at a third of a short shaft', () => {
    const barb = (box: Box, line: number) => {
      const [, [b1, tip]] = SHAPES.arrow.outline(box, line);
      return Math.hypot(b1.x - tip.x, b1.y - tip.y);
    };
    const short = { left: 100, top: 100, right: 580, bottom: 100 };
    const long = { left: 100, top: 100, right: 1600, bottom: 100 };
    expect(barb(long, 6)).toBeCloseTo(barb(short, 6), 6);
    const [thin, normal, thick] = WEIGHTS.map(w => barb(short, widthPx(WEIGHT_WIDTH[w])));
    expect(thin).toBeLessThan(normal);
    expect(normal).toBeLessThan(thick);
    expect(barb({ left: 100, top: 100, right: 160, bottom: 100 }, 10)).toBeCloseTo(20, 6);
  });

  it('draws the normal weight when no line width is given', () => {
    expect(NORMAL_LINE).toBe(widthPx(WEIGHT_WIDTH.normal));
  });

  it('keeps a nearly level drag level, through the middle of the box', () => {
    for (const def of [SHAPES.line, SHAPES.arrow, SHAPES.doubleArrow]) {
      const [shaft] = def.outline({ left: 200, top: 300, right: 800, bottom: 330 });
      expect([def.id, shaft]).toEqual([def.id, [{ x: 200, y: 315 }, { x: 800, y: 315 }]]);
      const [up] = def.outline({ left: 330, top: 800, right: 300, bottom: 200 });
      expect([def.id, up]).toEqual([def.id, [{ x: 315, y: 800 }, { x: 315, y: 200 }]]);
    }
  });

  it('redraws a level arrow level into its lasso box, which the head and the minimum side make taller than the shaft', () => {
    for (const weight of WEIGHTS) {
      const style = { ...DEFAULT_STYLE, weight };
      for (const right of [260, 800, 1700]) {
        const placed = renderShape(SHAPES.arrow, { left: 200, top: 300, right, bottom: 300 }, style, 1);
        const box = redrawBox(placed.bounds, WEIGHT_WIDTH[weight]);
        const [shaft] = SHAPES.arrow.outline(box, widthPx(WEIGHT_WIDTH[weight]));
        expect([weight, right, shaft[0].y, shaft[1].y]).toEqual([weight, right, 300, 300]);
      }
    }
  });

  it('redraws a level arrow placed when heads were sized by length level', () => {
    // A 1500 px arrow's lasso box from then: 135 px barbs at ±0.18π off the shaft, plus the pen.
    const spread = 0.09 * 1500 * Math.sin(Math.PI * 0.82);
    const box = redrawBox({ left: 200, top: 300 - spread - 3, right: 1700, bottom: 300 + spread + 3 }, 600);
    const [shaft] = SHAPES.arrow.outline(box);
    expect(shaft[0].y).toBeCloseTo(300, 6);
    expect(shaft[1].y).toBeCloseTo(300, 6);
  });

  it('draws a line as a bare shaft', () => {
    expect(SHAPES.line.outline({ left: 100, top: 100, right: 580, bottom: 100 })).toHaveLength(1);
  });

  it('runs elbow, arch and scoop arrows from pen-down to the tip at pen-up', () => {
    const drags = [
      { left: 800, top: 600, right: 200, bottom: 300 },
      { left: 200, top: 300, right: 800, bottom: 600 },
      { left: 200, top: 600, right: 800, bottom: 300 },
      { left: 800, top: 300, right: 200, bottom: 600 },
    ];
    for (const def of [SHAPES.elbowArrow, SHAPES.archArrow, SHAPES.scoopArrow]) {
      for (const d of drags) {
        const shaft = renderShape(def, fitBox(def, d), DEFAULT_STYLE, 1).geometries[0].points;
        expect([def.id, shaft[0]]).toEqual([def.id, { x: d.left, y: d.top }]);
        expect([def.id, shaft[shaft.length - 1]]).toEqual([def.id, { x: d.right, y: d.bottom }]);
      }
    }
  });

  it('an arrow dragged right-to-left points left, with normalised bounds', () => {
    const plan = renderShape(SHAPES.arrow, fitBox(SHAPES.arrow, { left: 800, top: 300, right: 200, bottom: 300 }), DEFAULT_STYLE, 1);
    const [shaft, head] = plan.geometries;
    expect(shaft.points[shaft.points.length - 1].x).toBe(200);
    expect(head.points.every(p => p.x >= 200)).toBe(true);
    expect(plan.bounds.left).toBe(200);
    expect(plan.bounds.right).toBe(800);
  });

  it('an arrow dragged upwards points up', () => {
    const plan = renderShape(SHAPES.arrow, fitBox(SHAPES.arrow, { left: 100, top: 900, right: 100, bottom: 300 }), DEFAULT_STYLE, 1);
    const head = plan.geometries[1];
    expect(head.points.every(p => p.y >= 300)).toBe(true);
    expect(plan.bounds.top).toBe(300);
  });
});

describe('flipFor', () => {
  it('records flip.x for a right-to-left drag of a directional arrow', () => {
    expect(flipFor(SHAPES.arrow, { left: 800, top: 300, right: 200, bottom: 300 })).toEqual({ x: true });
  });

  it('records no flip for a non-directional shape dragged the same way', () => {
    expect(flipFor(SHAPES.rectangle, { left: 800, top: 300, right: 200, bottom: 300 })).toBeUndefined();
  });

  it('records no flip for an unreversed drag', () => {
    expect(flipFor(SHAPES.arrow, { left: 200, top: 300, right: 800, bottom: 300 })).toBeUndefined();
  });

  it('records both axes when both are reversed', () => {
    expect(flipFor(SHAPES.elbowArrow, { left: 800, top: 600, right: 200, bottom: 300 })).toEqual({ x: true, y: true });
  });

  it('records the diagonal of a double arrow and a line', () => {
    expect(flipFor(SHAPES.doubleArrow, { left: 200, top: 600, right: 800, bottom: 300 })).toEqual({ y: true });
    expect(flipFor(SHAPES.line, { left: 800, top: 300, right: 200, bottom: 600 })).toEqual({ x: true });
  });
});

describe('redraw direction fidelity', () => {
  const direction = (pts: { x: number; y: number }[]) => ({
    x: Math.sign(pts[pts.length - 1].x - pts[0].x),
    y: Math.sign(pts[pts.length - 1].y - pts[0].y),
  });

  it.each([
    ['archArrow', SHAPES.archArrow, 'unreversed', { left: 200, top: 300, right: 800, bottom: 600 }],
    ['archArrow', SHAPES.archArrow, 'x-reversed', { left: 800, top: 300, right: 200, bottom: 600 }],
    ['archArrow', SHAPES.archArrow, 'y-reversed', { left: 200, top: 600, right: 800, bottom: 300 }],
    ['archArrow', SHAPES.archArrow, 'both axes reversed', { left: 800, top: 600, right: 200, bottom: 300 }],
    ['scoopArrow', SHAPES.scoopArrow, 'unreversed', { left: 200, top: 300, right: 800, bottom: 600 }],
    ['scoopArrow', SHAPES.scoopArrow, 'x-reversed', { left: 800, top: 300, right: 200, bottom: 600 }],
    ['scoopArrow', SHAPES.scoopArrow, 'y-reversed', { left: 200, top: 600, right: 800, bottom: 300 }],
    ['scoopArrow', SHAPES.scoopArrow, 'both axes reversed', { left: 800, top: 600, right: 200, bottom: 300 }],
    ['arrow', SHAPES.arrow, 'x-reversed diagonal', { left: 800, top: 300, right: 200, bottom: 600 }],
    ['arrow', SHAPES.arrow, 'upward', { left: 300, top: 800, right: 300, bottom: 200 }],
    ['doubleArrow', SHAPES.doubleArrow, 'y-reversed diagonal', { left: 200, top: 600, right: 800, bottom: 300 }],
    ['line', SHAPES.line, 'y-reversed diagonal', { left: 200, top: 600, right: 800, bottom: 300 }],
  ])('a %s redraws pointing the same way it was dragged (%s)', (_, def, __, dragged) => {
    const placed = renderShape(def, fitBox(def, dragged), DEFAULT_STYLE, 1);
    const flip = flipFor(def, dragged);
    // The lasso always hands back a normalised box, as plan.bounds does here.
    const redrawn = renderShape(def, applyFlip(placed.bounds, flip), DEFAULT_STYLE, 1);
    expect(direction(redrawn.geometries[0].points)).toEqual(direction(placed.geometries[0].points));
  });

  it.each([['archArrow', SHAPES.archArrow], ['scoopArrow', SHAPES.scoopArrow]])('a tapped %s redraws still rising', (_, def) => {
    const target = defaultBoxAt(def, point(600, 800), ctx);
    const placed = renderShape(def, target, DEFAULT_STYLE, 1);
    const redrawn = renderShape(def, applyFlip(placed.bounds, flipFor(def, target)), DEFAULT_STYLE, 1);
    expect(direction(redrawn.geometries[0].points)).toEqual({ x: 1, y: -1 });
  });
});
