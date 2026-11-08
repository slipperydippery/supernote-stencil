import { gapField, parseRecipe, redrawGap, serializeRecipe, type Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE, isStyle, readStyle, TONE_GAP } from '../src/render/style';

describe('recipe', () => {
  const r: Recipe = { v: 1, shape: 'decision', style: { ...DEFAULT_STYLE, look: 'hand', fill: 'hatch' }, seed: 42 };

  it('round-trips', () => {
    expect(parseRecipe(serializeRecipe(r))).toEqual(r);
  });

  it('serialises keys in contract order', () => {
    const style = { look: 'hand', ink: 'dark', tone: 'light', fill: 'none', line: 'solid', weight: 'thin' } as const;
    const out = serializeRecipe({ seed: 3, style, shape: 'rectangle', v: 1 } as Recipe);
    expect(out).toBe(
      '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"light","ink":"dark","look":"hand"},"seed":3}',
    );
    expect(Object.keys(JSON.parse(out).style)).toEqual(['weight', 'line', 'fill', 'tone', 'ink', 'look']);
  });

  it('reads a 1.1.0 recipe without ink as ink black', () => {
    const old = '{"v":1,"shape":"decision","style":{"weight":"thick","line":"dashed","fill":"hatch","tone":"light","look":"hand"},"seed":9}';
    expect(parseRecipe(old)).toEqual({ v: 1, shape: 'decision', style: { weight: 'thick', line: 'dashed', fill: 'hatch', tone: 'light', ink: 'black', look: 'hand' }, seed: 9 });
  });

  it('round-trips line none and a grey ink', () => {
    const grey: Recipe = { ...r, style: { ...r.style, fill: 'solid', line: 'none', ink: 'light' } };
    expect(parseRecipe(serializeRecipe(grey))).toEqual(grey);
  });

  it.each([
    ['none', { fill: 'none', tone: 'dark' }],
    ['hatch', { fill: 'hatch', tone: 'black' }],
    ['light', { fill: 'solid', tone: 'light' }],
    ['dark', { fill: 'solid', tone: 'dark' }],
  ])('upgrades a recipe written before tone with fill %s', (fill, expected) => {
    const old = `{"v":1,"shape":"decision","style":{"weight":"thick","line":"dashed","fill":"${fill}","look":"hand"},"seed":9}`;
    expect(parseRecipe(old)).toEqual({ v: 1, shape: 'decision', style: { weight: 'thick', line: 'dashed', look: 'hand', ink: 'black', ...expected }, seed: 9 });
  });

  it('rejects a four-key style whose fill is not a pre-tone value', () => {
    expect(parseRecipe('{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"cross","look":"hand"},"seed":1}')).toBeNull();
  });

  it('reads a recipe written before GH-45 naming arrowDown as an arrow, keeping its flip', () => {
    const old = '{"v":1,"shape":"arrowDown","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","look":"hand"},"seed":5,"flip":{"y":true}}';
    expect(parseRecipe(old)).toEqual({ v: 1, shape: 'arrow', style: { ...DEFAULT_STYLE, weight: 'thin', look: 'hand' }, seed: 5, flip: { y: true } });
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
    ['bad ink', '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","ink":"grey","look":"hand"},"seed":1}'],
    ['missing seed', '{"v":1,"shape":"rectangle","style":{"weight":"thin","line":"solid","fill":"none","tone":"dark","look":"hand"}}'],
    ['json null', 'null'],
  ])('rejects %s', (_, s) => {
    expect(parseRecipe(s as string | null | undefined)).toBeNull();
  });

  it('round-trips a gap, omitting the key when absent', () => {
    expect(parseRecipe(serializeRecipe({ ...r, gap: 34 }))).toEqual({ ...r, gap: 34 });
    expect(serializeRecipe(r)).not.toContain('gap');
  });

  it.each(['0', '-5', '"wide"', 'null'])('rejects a gap of %s', gap => {
    expect(parseRecipe(`${serializeRecipe(r).slice(0, -1)},"gap":${gap}}`)).toBeNull();
  });

  it('derives the built-in gaps from 4 / 11 / 21 % coverage', () => {
    expect(TONE_GAP.light).toBeCloseTo(67.5, 1);
    expect(TONE_GAP.dark).toBeCloseTo(24.55, 1);
    expect(TONE_GAP.black).toBeCloseTo(12.86, 1);
  });

  it('records a gap only for hatch and cross', () => {
    expect(gapField({ ...DEFAULT_STYLE, fill: 'hatch' }, 34)).toEqual({ gap: 34 });
    expect(gapField({ ...DEFAULT_STYLE, fill: 'cross' }, 34)).toEqual({ gap: 34 });
    expect(gapField({ ...DEFAULT_STYLE, fill: 'solid' }, 34)).toEqual({});
    expect(gapField({ ...DEFAULT_STYLE, fill: 'none' }, 34)).toEqual({});
  });

  describe('redrawGap', () => {
    const gaps = { light: 135, dark: 34, black: 9 };
    const hatched: Recipe = { ...r, style: { ...DEFAULT_STYLE, fill: 'hatch', tone: 'dark' }, gap: 18 };

    it("keeps the shape's own gap while the tone is unchanged, even when the setting moved", () => {
      expect(redrawGap(hatched, hatched.style, gaps)).toBe(18);
      expect(redrawGap(hatched, { ...hatched.style, fill: 'cross' }, gaps)).toBe(18);
    });

    it('gives a hatched shape placed before the setting its built-in gap', () => {
      const { gap: _, ...old } = hatched;
      expect(redrawGap(old, old.style, gaps)).toBe(TONE_GAP.dark);
    });

    it('takes the setting for a new tone', () => {
      expect(redrawGap(hatched, { ...hatched.style, tone: 'black' }, gaps)).toBe(9);
    });

    it('takes the setting when the shape had no hatch to keep', () => {
      const plain: Recipe = { ...r, style: { ...DEFAULT_STYLE, fill: 'none', tone: 'dark' } };
      expect(redrawGap(plain, { ...plain.style, fill: 'hatch' }, gaps)).toBe(34);
    });
  });
});

describe('readStyle', () => {
  const six = { weight: 'thin', line: 'none', fill: 'solid', tone: 'light', ink: 'dark', look: 'hand' };

  it('isStyle accepts exactly the six keys', () => {
    expect(isStyle(six)).toBe(true);
    const { ink: _, ...five } = six;
    expect(isStyle(five)).toBe(false);
    expect(isStyle({ ...six, extra: 1 })).toBe(false);
  });

  it('reads a five-key 1.1.0 style as ink black, without touching the input', () => {
    const five = { weight: 'thin', line: 'solid', fill: 'solid', tone: 'light', look: 'hand' };
    const copy = { ...five };
    expect(readStyle(five)).toEqual({ ...five, ink: 'black' });
    expect(five).toEqual(copy);
  });

  it('gives a four-key pre-GH-20 style both upgrades', () => {
    expect(readStyle({ weight: 'thin', line: 'solid', fill: 'light', look: 'clean' })).toEqual({ weight: 'thin', line: 'solid', fill: 'solid', tone: 'light', ink: 'black', look: 'clean' });
  });

  it('rejects a six-key style with an unknown ink', () => {
    expect(readStyle({ ...six, ink: 'grey' })).toBeNull();
  });
});
