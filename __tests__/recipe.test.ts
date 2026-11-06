import { parseRecipe, serializeRecipe, type Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE } from '../src/render/style';

describe('recipe', () => {
  const r: Recipe = { v: 1, shape: 'decision', style: { ...DEFAULT_STYLE, look: 'hand', fill: 'hatch' }, seed: 42 };

  it('round-trips', () => {
    expect(parseRecipe(serializeRecipe(r))).toEqual(r);
  });

  it('serialises keys in contract order', () => {
    const style = { look: 'hand', fill: 'none', line: 'solid', weight: 'thin' } as const;
    expect(serializeRecipe({ seed: 3, style, shape: 'line', v: 1 } as Recipe)).toBe(
      '{"v":1,"shape":"line","style":{"weight":"thin","line":"solid","fill":"none","look":"hand"},"seed":3}',
    );
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
    ['other version', '{"v":2}'],
    ['not json', '{v:1'],
    ['unknown shape', '{"v":1,"shape":"star","style":{"weight":"thin","line":"solid","fill":"none","look":"hand"},"seed":1}'],
    ['bad style', '{"v":1,"shape":"line","style":{"weight":"huge","line":"solid","fill":"none","look":"hand"},"seed":1}'],
    ['missing seed', '{"v":1,"shape":"line","style":{"weight":"thin","line":"solid","fill":"none","look":"hand"}}'],
    ['json null', 'null'],
  ])('rejects %s', (_, s) => {
    expect(parseRecipe(s as string | null | undefined)).toBeNull();
  });
});
