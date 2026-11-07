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
    id: 'archArrow', family: 'arrow', label: 'Arch arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    // Rises steeply from the frame's bottom-left, levels off into the head at the
    // top-right: at(f, t, 1 - sin(t·π/2)). Not pen-down-to-pen-up like the other
    // directional arrows (elbowArrow, etc.) — shaft[0] is (left, bottom), shaft's
    // last point is (right, top), regardless of drag direction, so it always reads
    // as climbing left-to-right. No fitBox special case needed for that: the box's
    // own left/right/top/bottom already carry the drag reversal (see flipFor in
    // src/ui/placement.ts), and this outline is a pure function of the box used
    // identically by both placement and redraw, so flip stays consistent either way
    // (GH-6 fixed a bug from special-casing only one of those two call sites).
    outline: box => {
      const f = frame(box);
      const p: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        p.push(at(f, t, 1 - Math.sin((t * Math.PI) / 2)));
      }
      const a = Math.atan2(p[40].y - p[39].y, p[40].x - p[39].x);
      return [p, head(p[40], a, f)];
    },
  },
  {
    id: 'scoopArrow', family: 'arrow', label: 'Scoop arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    // The same bottom-left-to-top-right span as archArrow, bowed the other way:
    // flat off the frame's bottom-left, steepening into the head at the top-right.
    // sin((1-t)·π/2) is archArrow's 1 - sin(t·π/2) with the easing mirrored in t
    // (so it shares archArrow's exact endpoints, only the curve's shape differs),
    // written to only ever evaluate Math.sin at 0 and π/2 — both round exactly,
    // where Math.cos(Math.PI / 2) does not.
    outline: box => {
      const f = frame(box);
      const p: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        p.push(at(f, t, Math.sin(((1 - t) * Math.PI) / 2)));
      }
      const a = Math.atan2(p[40].y - p[39].y, p[40].x - p[39].x);
      return [p, head(p[40], a, f)];
    },
  },
];
