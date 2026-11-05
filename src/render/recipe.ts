import { SHAPES, type ShapeId } from '../shapes';
import { FILLS, LINES, LOOKS, WEIGHTS, type Style } from './style';

export type Recipe = { v: 1; shape: ShapeId; style: Style; seed: number };

export function serializeRecipe(r: Recipe): string {
  const { weight, line, fill, look } = r.style;
  return JSON.stringify({ v: r.v, shape: r.shape, style: { weight, line, fill, look }, seed: r.seed });
}

function oneOf<T extends string>(values: readonly T[], x: unknown): x is T {
  return typeof x === 'string' && (values as readonly string[]).includes(x);
}

export function parseRecipe(s: string | null | undefined): Recipe | null {
  if (!s) {
    return null;
  }
  let o: any;
  try {
    o = JSON.parse(s);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.v !== 1) {
    return null;
  }
  const st = o.style;
  if (
    typeof o.shape !== 'string' ||
    !Object.prototype.hasOwnProperty.call(SHAPES, o.shape) ||
    !st ||
    typeof st !== 'object' ||
    !oneOf(WEIGHTS, st.weight) ||
    !oneOf(LINES, st.line) ||
    !oneOf(FILLS, st.fill) ||
    !oneOf(LOOKS, st.look) ||
    typeof o.seed !== 'number' ||
    !Number.isFinite(o.seed)
  ) {
    return null;
  }
  return { v: 1, shape: o.shape, style: { weight: st.weight, line: st.line, fill: st.fill, look: st.look }, seed: o.seed };
}
