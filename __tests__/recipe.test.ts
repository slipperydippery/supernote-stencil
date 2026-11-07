import { parseRecipe, serializeRecipe, type Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE } from '../src/render/style';

describe('recipe', () => {
  const r: Recipe = { v: 1, shape: 'decision', style: { ...DEFAULT_STYLE, look: 'hand', fill: 'hatch' }, seed: 42 };

  it('round-trips', () => {
    expect(parseRecipe(serializeRecipe(r))).toEqual(r);
  });

  it('serialises keys in contract order', () => {
    const style = { look: 'hand', tone: 'light', fill: 'none', line: 'solid', weight: 'thin' } as const;
    expect(serializeRecipe({ seed: 3, style, shape: 'rectangle', v: 1 } as Recipe)).toBe(
      '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"light","look":"hand"},"seed":3}',
    );
  });

  it.each([
    ['none', { fill: 'none', tone: 'dark' }],
    ['hatch', { fill: 'hatch', tone: 'dark' }],
    ['light', { fill: 'solid', tone: 'light' }],
    ['dark', { fill: 'solid', tone: 'dark' }],
  ])('upgrades a recipe written before tone with fill %s', (fill, expected) => {
    const old = `{"v":1,"shape":"decision","style":{"weight":"thick","line":"dashed","fill":"${fill}","look":"hand"},"seed":9}`;
    expect(parseRecipe(old)).toEqual({ v: 1, shape: 'decision', style: { weight: 'thick', line: 'dashed', look: 'hand', ...expected }, seed: 9 });
  });

  it('rejects a four-key style whose fill is not a pre-tone value', () => {
    expect(parseRecipe('{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"cross","look":"hand"},"seed":1}')).toBeNull();
  });

  it('round-trips flip, omitting the key when absent', () => {
    const withFlip: Recipe = { ...r, flip: { x: true } };
    expect(parseRecipe(serializeRecipe(withFlip))).toEqual(withFlip);
    expect(serializeRecipe(r)).not.toContain('flip');
  });

  it('omits a flip whose axes are all false', () => {
    expect(serializeRecipe({ ...r, flip: { x: false, y: false } })).not.toContain('flip');
  });

  it('rejects a malformed flip', () => {
    const base = '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","look":"hand"},"seed":1';
    expect(parseRecipe(`${base},"flip":"yes"}`)).toBeNull();
    expect(parseRecipe(`${base},"flip":{"x":"yes"}}`)).toBeNull();
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
    ['other version', '{"v":2}'],
    ['not json', '{v:1'],
    ['unknown shape', '{"v":1,"shape":"star","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","look":"hand"},"seed":1}'],
    ['bad style', '{"v":1,"shape":"rectangle","style":{"weight":"huge","line":"solid","fill":"none","tone":"dark","look":"hand"},"seed":1}'],
    ['bad tone', '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"grey","look":"hand"},"seed":1}'],
    ['missing seed', '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","look":"hand"}}'],
    ['json null', 'null'],
  ])('rejects %s', (_, s) => {
    expect(parseRecipe(s as string | null | undefined)).toBeNull();
  });
});
