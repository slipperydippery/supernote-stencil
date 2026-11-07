import { existsSync } from 'fs';
import { join } from 'path';
import { FILLS, LINES, LOOKS, TONES, WEIGHTS } from '../src/render/style';
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
    ...TONES.map(v => `tone-${v}`),
    ...LOOKS.map(v => `look-${v}`),
  ];
  it('has the strip marks', () => {
    for (const m of ['pin', 'pin-on', 'bin']) {
      expect(existsSync(join(ASSETS, 'glyphs', `${m}.png`))).toBe(true);
    }
  });

  it('has the fifteen style glyphs', () => {
    expect(glyphs).toHaveLength(15);
    for (const g of glyphs) {
      expect(existsSync(join(ASSETS, 'glyphs', `${g}.png`))).toBe(true);
    }
  });
});
