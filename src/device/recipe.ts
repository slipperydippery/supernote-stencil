import type { Family, Recipe, ShapeId, Style } from './contracts';

// Stand-in for PR 1's parseRecipe until PR 3 switches to `src/render/recipe`.

const STYLE_VALUES: { [K in keyof Style]: readonly Style[K][] } = {
  weight: ['thin', 'normal', 'thick'],
  line: ['solid', 'dashed', 'dotted'],
  fill: ['none', 'hatch', 'light', 'dark'],
  look: ['clean', 'hand'],
};

export const SHAPE_IDS: readonly ShapeId[] = [
  'rectangle', 'rounded', 'square', 'circle', 'ellipse', 'triangle', 'diamond', 'hexagon',
  'process', 'decision', 'terminator', 'data', 'document', 'manualInput', 'storedData', 'offPage',
  'line', 'arrow', 'doubleArrow', 'elbowArrow', 'curvedArrow', 'arrowDown',
];

export const FAMILY_IDS: readonly Family[] = ['basic', 'flow', 'arrow'];

export function isStyle(s: unknown): s is Style {
  if (!s || typeof s !== 'object') {
    return false;
  }
  const o = s as Record<string, unknown>;
  return (
    Object.keys(o).length === 4 &&
    (Object.keys(STYLE_VALUES) as (keyof Style)[]).every(k => (STYLE_VALUES[k] as readonly unknown[]).includes(o[k]))
  );
}

export function parseRecipeLocal(s: string | null | undefined): Recipe | null {
  if (typeof s !== 'string' || s.length === 0) {
    return null;
  }
  let o: any;
  try {
    o = JSON.parse(s);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.v !== 1 || !SHAPE_IDS.includes(o.shape) || !isStyle(o.style)) {
    return null;
  }
  if (typeof o.seed !== 'number' || !Number.isFinite(o.seed)) {
    return null;
  }
  return { v: 1, shape: o.shape, style: { weight: o.style.weight, line: o.style.line, fill: o.style.fill, look: o.style.look }, seed: o.seed };
}
