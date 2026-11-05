import { closedPoly, ellipse, frame, roundedRect } from './geom';
import type { ShapeDef } from './types';

const RECT: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
const DIAMOND: [number, number][] = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
// Reference hexagon: 172 wide, shoulders inset 30.
const HEX_INSET = 30 / 172;

export const BASIC: ShapeDef[] = [
  {
    id: 'rectangle', family: 'basic', label: 'Rectangle', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => closedPoly(frame(box), RECT),
  },
  {
    id: 'rounded', family: 'basic', label: 'Rounded', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    // Reference corner radius 16 on an 80-high box.
    outline: box => {
      const f = frame(box);
      return roundedRect(f, 0.2 * Math.min(f.w, f.h));
    },
  },
  {
    id: 'square', family: 'basic', label: 'Square', closed: true,
    defaultSize: { w: 300, h: 300 }, keepAspect: true,
    outline: box => closedPoly(frame(box), RECT),
  },
  {
    id: 'circle', family: 'basic', label: 'Circle', closed: true,
    defaultSize: { w: 300, h: 300 }, keepAspect: true,
    outline: box => ellipse(frame(box), 72),
  },
  {
    id: 'ellipse', family: 'basic', label: 'Ellipse', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => ellipse(frame(box), 80),
  },
  {
    id: 'triangle', family: 'basic', label: 'Triangle', closed: true,
    defaultSize: { w: 360, h: 300 }, keepAspect: false,
    outline: box => closedPoly(frame(box), [[0.5, 0], [1, 1], [0, 1]]),
  },
  {
    id: 'diamond', family: 'basic', label: 'Diamond', closed: true,
    defaultSize: { w: 480, h: 300 }, keepAspect: false,
    outline: box => closedPoly(frame(box), DIAMOND),
  },
  {
    id: 'hexagon', family: 'basic', label: 'Hexagon', closed: true,
    defaultSize: { w: 480, h: 300 }, keepAspect: false,
    outline: box =>
      closedPoly(frame(box), [[HEX_INSET, 0], [1 - HEX_INSET, 0], [1, 0.5], [1 - HEX_INSET, 1], [HEX_INSET, 1], [0, 0.5]]),
  },
];

export { RECT, DIAMOND };
