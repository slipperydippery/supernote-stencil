import { segmentRects } from '../src/ui/ShapePreview';

describe('segmentRects', () => {
  it('draws a horizontal segment as a single axis-aligned rect', () => {
    const rects = segmentRects({ x: 10, y: 20 }, { x: 50, y: 20 });
    expect(rects).toHaveLength(1);
    expect(rects[0].height).toBe(2);
    expect(rects[0].width).toBeCloseTo(42);
  });

  it('draws a vertical segment as a single axis-aligned rect', () => {
    const rects = segmentRects({ x: 10, y: 20 }, { x: 10, y: 60 });
    expect(rects).toHaveLength(1);
    expect(rects[0].width).toBe(2);
    expect(rects[0].height).toBeCloseTo(42);
  });

  it('skips a zero-length segment', () => {
    expect(segmentRects({ x: 5, y: 5 }, { x: 5, y: 5 })).toHaveLength(0);
  });

  it('approximates a diagonal segment as a staircase of axis-aligned rects, none rotated', () => {
    const rects = segmentRects({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(rects.length).toBeGreaterThan(2);
    for (const r of rects) {
      // Every rect is a plain axis-aligned box: no rotation, so one dimension is always the hairline width.
      expect(Math.min(r.width, r.height)).toBeCloseTo(2);
    }
    // The staircase spans the full segment: leftmost/topmost and rightmost/bottommost edges match the endpoints.
    expect(Math.min(...rects.map(r => r.left))).toBeCloseTo(-1, 0);
    expect(Math.max(...rects.map(r => r.left + r.width))).toBeCloseTo(101, 0);
    expect(Math.min(...rects.map(r => r.top))).toBeCloseTo(-1, 0);
    expect(Math.max(...rects.map(r => r.top + r.height))).toBeCloseTo(101, 0);
  });

  it('caps the staircase step count for a very long diagonal segment', () => {
    const rects = segmentRects({ x: 0, y: 0 }, { x: 2000, y: 2000 });
    // Two rects (one horizontal, one vertical) per step, capped at MAX_STEPS.
    expect(rects.length).toBeLessThanOrEqual(48);
  });
});
