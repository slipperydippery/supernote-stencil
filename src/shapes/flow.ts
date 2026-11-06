import { DIAMOND, RECT } from './basic';
import { arc, at, closedPoly, frame, roundedRect } from './geom';
import type { Pt, ShapeDef } from './types';

// Ratios from the reference renderer's preview geometry, normalised to each shape's bounds.
const DATA_SKEW = 36 / 172;
const DOC_WAVE = 10 / 82;
const MANUAL_SLANT = 28 / 80;
const STORED_R = 18 / 172;
const OFFPAGE_SHOULDER = 66 / 92;

export const FLOW: ShapeDef[] = [
  {
    id: 'process', family: 'flow', label: 'Process', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => closedPoly(frame(box), RECT),
  },
  {
    id: 'decision', family: 'flow', label: 'Decision', closed: true,
    defaultSize: { w: 480, h: 300 }, keepAspect: false,
    outline: box => closedPoly(frame(box), DIAMOND),
  },
  {
    id: 'terminator', family: 'flow', label: 'Terminator', closed: true,
    defaultSize: { w: 480, h: 200 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      return roundedRect(f, Math.min(f.w, f.h) / 2);
    },
  },
  {
    id: 'data', family: 'flow', label: 'Data', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => closedPoly(frame(box), [[DATA_SKEW, 0], [1, 0], [1 - DATA_SKEW, 1], [0, 1]]),
  },
  {
    id: 'document', family: 'flow', label: 'Document', closed: true,
    defaultSize: { w: 480, h: 260 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const base = 1 - DOC_WAVE;
      const p: Pt[] = [at(f, 0, 0), at(f, 1, 0), at(f, 1, base)];
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        p.push(at(f, 1 - t, base + Math.sin(t * Math.PI * 2) * DOC_WAVE));
      }
      p.push(p[0]);
      return [p];
    },
  },
  {
    id: 'manualInput', family: 'flow', label: 'Manual input', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => closedPoly(frame(box), [[0, MANUAL_SLANT], [1, 0], [1, 1], [0, 1]]),
  },
  {
    id: 'storedData', family: 'flow', label: 'Stored data', closed: true,
    defaultSize: { w: 480, h: 240 }, keepAspect: false,
    outline: box => {
      const f = frame(box);
      const r = Math.min(STORED_R * f.w, f.w / 2);
      const cy = f.y + f.h / 2;
      const ry = f.h / 2;
      const p: Pt[] = [
        ...arc(f.x + r, cy, r, ry, Math.PI / 2, 1.5 * Math.PI, 20),
        ...arc(f.x + f.w, cy, r, ry, 1.5 * Math.PI, Math.PI / 2, 20),
      ];
      p.push(p[0]);
      return [p];
    },
  },
  {
    id: 'offPage', family: 'flow', label: 'Off-page', closed: true,
    defaultSize: { w: 300, h: 360 }, keepAspect: false,
    outline: box =>
      closedPoly(frame(box), [[0, 0], [1, 0], [1, OFFPAGE_SHOULDER], [0.5, 1], [0, OFFPAGE_SHOULDER]]),
  },
];
