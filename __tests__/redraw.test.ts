import { applyFlip, redrawBox } from '../src/ui/redraw';

describe('redrawBox', () => {
  it('insets the rect by about half the stroke width plus join slack', () => {
    expect(redrawBox({ left: 100, top: 100, right: 500, bottom: 300 }, 600)).toEqual({ left: 107, top: 107, right: 493, bottom: 293 });
  });

  it('insets more for a thicker stroke', () => {
    expect(redrawBox({ left: 0, top: 0, right: 200, bottom: 200 }, 1000)).toEqual({ left: 9, top: 9, right: 191, bottom: 191 });
  });

  it('never produces a box thinner than 24 px, clamped around the centre', () => {
    const b = redrawBox({ left: 0, top: 0, right: 20, bottom: 20 }, 1000);
    expect(b.right - b.left).toBe(24);
    expect(b.bottom - b.top).toBe(24);
    expect((b.left + b.right) / 2).toBe(10);
    expect((b.top + b.bottom) / 2).toBe(10);
  });
});

describe('applyFlip', () => {
  const box = { left: 0, top: 0, right: 100, bottom: 50 };

  it('returns the box unchanged with no flip', () => {
    expect(applyFlip(box)).toEqual(box);
    expect(applyFlip(box, {})).toEqual(box);
  });

  it('swaps left and right on flip.x', () => {
    expect(applyFlip(box, { x: true })).toEqual({ left: 100, top: 0, right: 0, bottom: 50 });
  });

  it('swaps top and bottom on flip.y', () => {
    expect(applyFlip(box, { y: true })).toEqual({ left: 0, top: 50, right: 100, bottom: 0 });
  });

  it('swaps both axes when both are set', () => {
    expect(applyFlip(box, { x: true, y: true })).toEqual({ left: 100, top: 50, right: 0, bottom: 0 });
  });
});
