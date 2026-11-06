import { existsSync } from 'fs';
import { join } from 'path';
import { FILLS, LINES, LOOKS, WEIGHTS } from '../src/render/style';
import { ALL_IDS } from '../test/helpers';

const ASSETS = join(__dirname, '..', 'assets');

describe('icons', () => {
  it.each(ALL_IDS)('has a shape icon for %s', id => {
    expect(existsSync(join(ASSETS, 'shapes', `${id}.png`))).toBe(true);
  });

  const glyphs = [
    ...WEIGHTS.map(v => `weight-${v}`),
    ...LINES.map(v => `line-${v}`),
    ...FILLS.map(v => `fill-${v}`),
    ...LOOKS.map(v => `look-${v}`),
  ];
  it('has the twelve style glyphs', () => {
    expect(glyphs).toHaveLength(12);
    for (const g of glyphs) {
      expect(existsSync(join(ASSETS, 'glyphs', `${g}.png`))).toBe(true);
    }
  });
});
