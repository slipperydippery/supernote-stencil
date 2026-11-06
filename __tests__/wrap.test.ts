import { SHAPES, type Box, type Pt, type ShapeDef } from '../src/shapes';
import { union, wrapBox, WRAP_PADDING } from '../src/ui/wrap';

const selection: Box = { left: 100, top: 100, right: 300, bottom: 200 };

/**
 * Half-plane test per edge of a convex polygon (consistent winding, as every
 * `outline()` produces). Flat edges of hexagon/triangle sit exactly flush with
 * a padded-box edge by design (same as a tangent diamond/circle corner), so
 * boundary points must count as contained — a parity ray-casting test is
 * ambiguous exactly there, this is not.
 */
function insideConvexPolygon(p: Pt, poly: Pt[], eps = 1e-6): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < eps) {
      continue;
    }
    const s = Math.sign(cross);
    if (sign === 0) {
      sign = s;
    } else if (s !== sign) {
      return false;
    }
  }
  return true;
}

function corners(b: Box): Pt[] {
  return [
    { x: b.left, y: b.top },
    { x: b.right, y: b.top },
    { x: b.right, y: b.bottom },
    { x: b.left, y: b.bottom },
  ];
}

/**
 * Checks the real outline (not just the growth ratios) against the padded
 * selection's corners — wrapBox's own contract is to contain the padded box,
 * not just the raw selection.
 */
function wrapContainsPadded(def: ShapeDef, sel: Box, padding: number): boolean {
  const box = wrapBox(def, sel, padding);
  const outline = def.outline(box)[0];
  const padded = { left: sel.left - padding, top: sel.top - padding, right: sel.right + padding, bottom: sel.bottom + padding };
  return corners(padded).every(p => insideConvexPolygon(p, outline));
}

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

  it('grows an ellipse by 21% per side, keeping the selection\'s own aspect ratio', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.ellipse, selection, 24);
    const dx = (padded.right - padded.left) * 0.21;
    const dy = (padded.bottom - padded.top) * 0.21;
    expect(box).toEqual({ left: padded.left - dx, top: padded.top - dy, right: padded.right + dx, bottom: padded.bottom + dy });
  });

  it('squares a circle (keepAspect) before growing it by 21%, unlike ellipse', () => {
    // `selection` is wider than tall, so a circle that failed to square first would come out oval.
    const box = wrapBox(SHAPES.circle, selection, 24);
    expect(box.right - box.left).toBeCloseTo(box.bottom - box.top);
    expect(wrapBox(SHAPES.circle, selection, 24)).not.toEqual(wrapBox(SHAPES.ellipse, selection, 24));
  });

  it('contains the padded selection inside the real circle outline, for a wide selection too', () => {
    expect(wrapContainsPadded(SHAPES.circle, selection, 24)).toBe(true);
    expect(wrapContainsPadded(SHAPES.circle, { left: 0, top: 0, right: 600, bottom: 80 }, 24)).toBe(true);
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

  it('grows a triangle horizontally and extends only its top, leaving the base flush with the selection', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.triangle, selection, 24);
    expect(box.right - box.left).toBeCloseTo((padded.right - padded.left) * 2.2);
    expect(box.bottom).toBe(padded.bottom);
    expect(box.top).toBeCloseTo(padded.top - (padded.bottom - padded.top));
  });

  it('contains the padded selection inside the real triangle outline', () => {
    expect(wrapContainsPadded(SHAPES.triangle, selection, 24)).toBe(true);
    // A short, wide selection is the tightest case: the apex has the least room to taper.
    expect(wrapContainsPadded(SHAPES.triangle, { left: 0, top: 0, right: 600, bottom: 80 }, 24)).toBe(true);
  });

  it('grows a hexagon only horizontally', () => {
    const padded = wrapBox(SHAPES.rectangle, selection, 24);
    const box = wrapBox(SHAPES.hexagon, selection, 24);
    expect(box.right - box.left).toBeCloseTo((padded.right - padded.left) * 1.54);
    expect(box.top).toBe(padded.top);
    expect(box.bottom).toBe(padded.bottom);
  });

  it('contains the padded selection inside the real hexagon outline', () => {
    expect(wrapContainsPadded(SHAPES.hexagon, selection, 24)).toBe(true);
    expect(wrapContainsPadded(SHAPES.hexagon, { left: 0, top: 0, right: 600, bottom: 80 }, 24)).toBe(true);
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
