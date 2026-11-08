import { DEFAULT_STYLE, STYLE_KEYS, STYLE_VALUES, type Style } from '../src/render/style';
import { choose, forShape, groupDisabled, valueDisabled } from '../src/ui/styleRules';

const filled: Style = { ...DEFAULT_STYLE, fill: 'solid' };
const bare: Style = { ...filled, line: 'none' };

describe('groupDisabled', () => {
  it('dims tone while fill is none', () => {
    expect(groupDisabled('tone', DEFAULT_STYLE)).toBe(true);
    expect(groupDisabled('tone', filled)).toBe(false);
  });

  it('dims weight and ink while line is none, and nothing else', () => {
    expect(STYLE_KEYS.filter(g => groupDisabled(g, bare))).toEqual(['weight', 'ink']);
    expect(STYLE_KEYS.filter(g => groupDisabled(g, filled))).toEqual([]);
  });
});

describe('valueDisabled', () => {
  it('offers line none only on a filled closed shape', () => {
    expect(valueDisabled('line', 'none', filled, true)).toBe(true);
    expect(valueDisabled('line', 'none', DEFAULT_STYLE, false)).toBe(true);
    expect(valueDisabled('line', 'none', filled, false)).toBe(false);
  });

  it('never disables any other value', () => {
    for (const g of STYLE_KEYS) {
      for (const v of STYLE_VALUES[g]) {
        if (!(g === 'line' && v === 'none')) {
          expect(valueDisabled(g, v, DEFAULT_STYLE, true)).toBe(false);
        }
      }
    }
  });
});

describe('choose', () => {
  it('sets the value', () => {
    expect(choose(DEFAULT_STYLE, 'ink', 'dark')).toEqual({ ...DEFAULT_STYLE, ink: 'dark' });
  });

  it('resets line to solid on fill none while line is none', () => {
    expect(choose(bare, 'fill', 'none')).toEqual({ ...bare, fill: 'none', line: 'solid' });
  });

  it('leaves line alone otherwise', () => {
    expect(choose(bare, 'fill', 'hatch')).toEqual({ ...bare, fill: 'hatch' });
    expect(choose({ ...filled, line: 'dashed' }, 'fill', 'none')).toEqual({ ...filled, line: 'dashed', fill: 'none' });
  });
});

describe('forShape', () => {
  it('resets line none to solid for an open shape', () => {
    expect(forShape(bare, false)).toEqual({ ...bare, line: 'solid' });
  });

  it('keeps the style for a closed shape, or a line that is not none', () => {
    expect(forShape(bare, true)).toBe(bare);
    expect(forShape(filled, false)).toBe(filled);
  });
});
