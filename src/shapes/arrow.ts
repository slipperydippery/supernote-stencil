/**
 * Open shapes. The first polyline is the shaft, every further polyline is an
 * arrow head. Lines keep working on a degenerate box (zero height or width).
 */
import { at, frame, head } from './geom';
import type { Pt, ShapeDef } from './types';

export const ARROW: ShapeDef[] = [
  {
    id: 'line', family: 'arrow', label: 'Line', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      return [[at(f, 0, 0.5), at(f, 1, 0.5)]];
    },
  },
  {
    id: 'arrow', family: 'arrow', label: 'Arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 1, 0.5);
      return [[at(f, 0, 0.5), end], head(end, 0, f)];
    },
  },
  {
    id: 'doubleArrow', family: 'arrow', label: 'Double arrow', closed: false,
    defaultSize: { w: 480, h: 0 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const start = at(f, 0, 0.5);
      const end = at(f, 1, 0.5);
      return [[start, end], head(end, 0, f), head(start, Math.PI, f)];
    },
  },
  {
    id: 'elbowArrow', family: 'arrow', label: 'Elbow arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 1, 1);
      return [[at(f, 0, 0), at(f, 0.5, 0), at(f, 0.5, 1), end], head(end, 0, f)];
    },
  },
  {
    id: 'curvedArrow', family: 'arrow', label: 'Curved arrow', closed: false,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
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
    id: 'arrowDown', family: 'arrow', label: 'Arrow down', closed: false,
    defaultSize: { w: 0, h: 300 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const end = at(f, 0.5, 1);
      return [[at(f, 0.5, 0), end], head(end, Math.PI / 2, f)];
    },
  },
];
