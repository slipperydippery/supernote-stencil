import { SHAPES, type Box } from '../src/shapes';
import { union, wrapBox, WRAP_PADDING } from '../src/ui/wrap';

const selection: Box = { left: 100, top: 100, right: 300, bottom: 200 };

describe('wrapBox', () => {
  it('pads a rectangle on every side', () => {
    expect(wrapBox(SHAPES.rectangle, selection, 24)).toEqual({ left: 76, top: 76, right: 324, bottom: 224 });
  });

  it('doubles the padded box around its centre for a diamond', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.diamond, selection, 24);
    expect(box.right - box.left).toBeCloseTo(2 * (padded.right - padded.left));
    expect(box.bottom - box.top).toBeCloseTo(2 * (padded.bottom - padded.top));
    expect((box.left + box.right) / 2).toBeCloseTo((padded.left + padded.right) / 2);
    expect((box.top + box.bottom) / 2).toBeCloseTo((padded.top + padded.bottom) / 2);
  });

  it('treats decision the same as diamond', () => {
    expect(wrapBox(SHAPES.decision, selection, 24)).toEqual(wrapBox(SHAPES.diamond, selection, 24));
  });

  it('grows a circle by 21% per side', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.circle, selection, 24);
    const dx = (padded.right - padded.left) * 0.21;
    const dy = (padded.bottom - padded.top) * 0.21;
    expect(box).toEqual({ left: padded.left - dx, top: padded.top - dy, right: padded.right + dx, bottom: padded.bottom + dy });
  });

  it('treats ellipse the same as circle', () => {
    expect(wrapBox(SHAPES.ellipse, selection, 24)).toEqual(wrapBox(SHAPES.circle, selection, 24));
  });

  it('squares the padded box, centred, containing it', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.square, selection, 24);
    expect(box.right - box.left).toBeCloseTo(box.bottom - box.top);
    expect(box.left).toBeLessThanOrEqual(padded.left);
    expect(box.top).toBeLessThanOrEqual(padded.top);
    expect(box.right).toBeGreaterThanOrEqual(padded.right);
    expect(box.bottom).toBeGreaterThanOrEqual(padded.bottom);
  });

  it('grows a triangle more on the vertical axis than the horizontal', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.triangle, selection, 24);
    expect(box.right - box.left).toBeCloseTo((padded.right - padded.left) * 1.7);
    expect(box.bottom - box.top).toBeCloseTo((padded.bottom - padded.top) * 2.2);
  });

  it('grows a hexagon only horizontally', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.hexagon, selection, 24);
    expect(box.right - box.left).toBeCloseTo((padded.right - padded.left) * 1.5);
    expect(box.top).toBe(padded.top);
    expect(box.bottom).toBe(padded.bottom);
  });

  it('WRAP_PADDING is the sketch default', () => {
    expect(WRAP_PADDING).toBe(24);
  });
});

describe('union', () => {
  it('spans the outer edges of both boxes', () => {
    const a: Box = { left: 10, top: 10, right: 50, bottom: 60 };
    const b: Box = { left: 0, top: 30, right: 40, bottom: 90 };
    expect(union(a, b)).toEqual({ left: 0, top: 10, right: 50, bottom: 90 });
  });
});
