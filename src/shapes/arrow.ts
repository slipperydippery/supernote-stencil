/**
 * Open shapes. The first polyline is the shaft, every further polyline is an
 * arrow head. Lines keep working on a degenerate box (zero height or width).
 * A box with left > right (or top > bottom) mirrors the shape, so an arrow
 * follows the drag that made it. The straight shapes run from pen-down to
 * pen-up, so a drag points them in any direction.
 */
import { at, frame, head, headWidth, type Frame } from './geom';
import type { Pt, ShapeDef } from './types';

/**
 * Shaft of a straight shape: pen-down corner to pen-up corner, or level through
 * the middle of the box when its short side is no wider than an arrow head
 * (with slack for hand-drawn ink). The snap keeps a nearly level drag level,
 * and keeps a level arrow level on redraw, where the lasso box is the ink's
 * bounds: head barbs and a minimum side give it height a shaft does not have.
 */
function shaft(f: Frame): [Pt, Pt] {
  const snap = 1.25 * headWidth(Math.max(Math.abs(f.w), Math.abs(f.h)));
  if (Math.abs(f.h) <= snap && Math.abs(f.w) >= Math.abs(f.h)) {
    return [at(f, 0, 0.5), at(f, 1, 0.5)];
  }
  if (Math.abs(f.w) <= snap) {
    return [at(f, 0.5, 0), at(f, 0.5, 1)];
  }
  return [at(f, 0, 0), at(f, 1, 1)];
}

/** Head angle for a shaft running along +x of the frame, mirrored with it. */
const east = (f: Frame) => (f.w < 0 ? Math.PI : 0);

const angle = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);

/** Heads on a straight shaft are sized from its length, so a diagonal arrow is not sized from one side only. */
const length = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

export const ARROW: ShapeDef[] = [
  {
    id: 'line', family: 'arrow', label: 'Line', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => [shaft(frame(box))],
  },
  {
    id: 'arrow', family: 'arrow', label: 'Arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const [start, end] = shaft(f);
      return [[start, end], head(end, angle(start, end), f, length(start, end))];
    },
  },
  {
    id: 'doubleArrow', family: 'arrow', label: 'Double arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const [start, end] = shaft(f);
      return [[start, end], head(end, angle(start, end), f, length(start, end)), head(start, angle(end, start), f, length(start, end))];
    },
  },
  {
    id: 'elbowArrow', family: 'arrow', label: 'Elbow arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 1, 1);
      return [[at(f, 0, 0), at(f, 0.5, 0), at(f, 0.5, 1), end], head(end, east(f), f)];
    },
  },
  {
    id: 'archArrow', family: 'arrow', label: 'Arch arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false, rising: true,
    // Runs from (left, top) to (right, bottom), i.e. pen-down to pen-up like
    // elbowArrow: steep off pen-down, levelling off into the head.
    outline: box => {
      const f = frame(box);
      const p: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        p.push(at(f, t, Math.sin((t * Math.PI) / 2)));
      }
      const a = Math.atan2(p[40].y - p[39].y, p[40].x - p[39].x);
      return [p, head(p[40], a, f)];
    },
  },
  {
    id: 'scoopArrow', family: 'arrow', label: 'Scoop arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false, rising: true,
    // archArrow bowed the other way: flat off pen-down, steepening into the head.
    outline: box => {
      const f = frame(box);
      const p: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        p.push(at(f, t, 1 - Math.sin(((1 - t) * Math.PI) / 2)));
      }
      const a = Math.atan2(p[40].y - p[39].y, p[40].x - p[39].x);
      return [p, head(p[40], a, f)];
    },
  },
];
