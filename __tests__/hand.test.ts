import { handDrawnOutline, peakThickness, pressureForFraction, pressureFromWidth, splitLong, splitStrokes, type XY } from '../src/render/hand';

describe('pressure mapping', () => {
  it('interpolates the measured curve and clamps at both ends', () => {
    expect(pressureForFraction(0)).toBe(400);
    expect(pressureForFraction(0.33)).toBe(400);
    expect(pressureForFraction(0.67)).toBe(800);
    expect(pressureForFraction(0.83)).toBe(1200);
    expect(pressureForFraction(1)).toBe(1600);
    expect(pressureForFraction(2)).toBe(1600);
    expect(pressureForFraction(0.75)).toBe(1000);
  });

  it('sets thickness to the profile peak and maps widths down from it', () => {
    expect(peakThickness(600, 0.4)).toBeCloseTo(720);
    expect(pressureFromWidth(720, 720)).toBe(1600);
  });
});

describe('stroke splitting', () => {
  const rect: XY[] = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]];

  it('splits a rectangle at its four corners', () => {
    expect(splitStrokes(rect, true)).toHaveLength(4);
  });

  it('splits long runs into equal pieces', () => {
    const run: XY[] = Array.from({ length: 101 }, (_, i) => [i * 3, 0]);
    expect(splitLong(run, 130)).toHaveLength(3);
  });

  it('is deterministic for a seed', () => {
    const a = handDrawnOutline(rect, true, 5, 600);
    expect(handDrawnOutline(rect, true, 5, 600)).toEqual(a);
    expect(handDrawnOutline(rect, true, 6, 600)).not.toEqual(a);
  });
});
