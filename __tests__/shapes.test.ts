import { FAMILIES, SHAPES, shapesIn } from '../src/shapes';
import { ALL_IDS, defaultBox } from '../test/helpers';

describe('shapes', () => {
  it('lists the families in palette order', () => {
    expect(FAMILIES).toEqual(['basic', 'flow', 'arrow']);
  });

  it('keeps palette order within each family', () => {
    expect(shapesIn('basic').map(d => d.id)).toEqual([
      'rectangle', 'rounded', 'square', 'circle', 'ellipse', 'triangle', 'diamond', 'hexagon',
    ]);
    expect(shapesIn('flow').map(d => d.id)).toEqual([
      'process', 'decision', 'terminator', 'data', 'document', 'manualInput', 'storedData', 'offPage',
    ]);
    expect(shapesIn('arrow').map(d => d.id)).toEqual([
      'arrow', 'arrowDown', 'doubleArrow', 'elbowArrow', 'curvedArrow', 'curvedArrowDown',
    ]);
  });

  it('keys every definition by its own id', () => {
    expect(ALL_IDS).toHaveLength(22);
    for (const id of ALL_IDS) {
      expect(SHAPES[id].id).toBe(id);
    }
  });

  it('keeps aspect only for square and circle', () => {
    expect(ALL_IDS.filter(id => SHAPES[id].keepAspect).sort()).toEqual(['circle', 'square']);
  });

  it.each(ALL_IDS)('%s outlines fill the box with finite points', id => {
    const def = SHAPES[id];
    const box = defaultBox(def);
    const lines = def.outline(box);
    expect(lines.length).toBeGreaterThan(0);
    const pts = lines[0];
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    for (const p of lines.flat()) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
    // The first polyline spans the box along each non-degenerate side.
    if (def.defaultSize.w > 0) {
      expect(Math.min(...xs)).toBeCloseTo(box.left, 6);
      expect(Math.max(...xs)).toBeCloseTo(box.right, 6);
    }
    if (def.defaultSize.h > 0 && def.family !== 'arrow') {
      expect(Math.min(...ys)).toBeCloseTo(box.top, 6);
      expect(Math.max(...ys)).toBeCloseTo(box.bottom, 6);
    }
    if (def.closed) {
      expect(pts[pts.length - 1]).toEqual(pts[0]);
    }
  });

  it('samples curves with the specified point counts', () => {
    const box = { left: 0, top: 0, right: 480, bottom: 240 };
    expect(SHAPES.circle.outline(box)[0]).toHaveLength(73);
    expect(SHAPES.ellipse.outline(box)[0]).toHaveLength(81);
    expect(SHAPES.rounded.outline(box)[0]).toHaveLength(4 * 11 + 1);
    expect(SHAPES.storedData.outline(box)[0]).toHaveLength(2 * 21 + 1);
  });
});
