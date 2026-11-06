import { renderShape } from '../src/render/plan';
import { DEFAULT_STYLE } from '../src/render/style';
import { SHAPES } from '../src/shapes';
import { defaultBoxAt, fitBox, MIN_SIDE, toPagePx } from '../src/ui/placement';

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
    expect(fitBox(SHAPES.doubleArrow, dragLeft)).toEqual({ left: 200, top: 300, right: 800, bottom: 304 });
    expect(fitBox(SHAPES.line, dragLeft)).toEqual({ left: 200, top: 300, right: 800, bottom: 304 });
    expect(fitBox(SHAPES.arrowDown, { left: 104, top: 900, right: 100, bottom: 300 })).toEqual({ left: 100, top: 900, right: 104, bottom: 300 });
  });

  it('an arrow dragged right-to-left points left, with normalised bounds', () => {
    const plan = renderShape(SHAPES.arrow, fitBox(SHAPES.arrow, { left: 800, top: 300, right: 200, bottom: 300 }), DEFAULT_STYLE, 1);
    const [shaft, head] = plan.geometries;
    expect(shaft.points[shaft.points.length - 1].x).toBe(200);
    expect(head.points.every(p => p.x >= 200)).toBe(true);
    expect(plan.bounds.left).toBe(200);
    expect(plan.bounds.right).toBe(800);
  });

  it('an arrowDown dragged upwards points up', () => {
    const plan = renderShape(SHAPES.arrowDown, fitBox(SHAPES.arrowDown, { left: 100, top: 900, right: 100, bottom: 300 }), DEFAULT_STYLE, 1);
    const head = plan.geometries[1];
    expect(head.points.every(p => p.y >= 300)).toBe(true);
    expect(plan.bounds.top).toBe(300);
  });
});
