/**
 * Open shapes. The first polyline is the shaft, every further polyline is an
 * arrow head. Lines keep working on a degenerate box (zero height or width).
 * A box with left > right (or top > bottom) mirrors the shape, so an arrow
 * follows the drag that made it.
 */
import { at, frame, head, type Frame } from './geom';
import type { Pt, ShapeDef } from './types';

/** Head angle for a shaft running along +x (or +y) of the frame, mirrored with it. */
const east = (f: Frame) => (f.w < 0 ? Math.PI : 0);
const south = (f: Frame) => (f.h < 0 ? -Math.PI / 2 : Math.PI / 2);

export const ARROW: ShapeDef[] = [
  {
    id: 'arrow', family: 'arrow', label: 'Arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 1, 0.5);
      return [[at(f, 0, 0.5), end], head(end, east(f), f)];
    },
  },
  {
    id: 'arrowDown', family: 'arrow', label: 'Arrow down', closed: false,
    defaultSize: { w: 0, h: 300 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 0.5, 1);
      return [[at(f, 0.5, 0), end], head(end, south(f), f)];
    },
  },
  {
    id: 'doubleArrow', family: 'arrow', label: 'Double arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const start = at(f, 0, 0.5);
      const end = at(f, 1, 0.5);
      return [[start, end], head(end, east(f), f), head(start, east(f) + Math.PI, f)];
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
    id: 'curvedArrow', family: 'arrow', label: 'Curved arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    // Steep at pen-down, levels off into the head: at(f, t, sin(t·π/2)).
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
    id: 'curvedArrowDown', family: 'arrow', label: 'Curved arrow down', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    // The same bow the other way round: flat at pen-down, steepens into the head.
    // 1 - sin((1-t)·π/2) is curvedArrow's sin(t·π/2) with start and end swapped
    // (sin(π/2 − x) = cos(x), so this equals 1 - cos(t·π/2)) — written with sin
    // throughout, not cos, so both endpoints land on exactly 0 and 1: Math.sin(0)
    // and Math.sin(Math.PI / 2) round exactly, Math.cos(Math.PI / 2) does not.
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
