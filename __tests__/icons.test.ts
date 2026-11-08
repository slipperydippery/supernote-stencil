import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { FILLS, INKS, LINES, LOOKS, TONES, WEIGHTS } from '../src/render/style';
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
    ...INKS.map(v => `ink-${v}`),
    ...LOOKS.map(v => `look-${v}`),
  ];
  it('has the strip marks', () => {
    for (const m of ['pin', 'pin-on', 'bin']) {
      expect(existsSync(join(ASSETS, 'glyphs', `${m}.png`))).toBe(true);
    }
  });

  it('has the nineteen style glyphs', () => {
    expect(glyphs).toHaveLength(19);
    expect(glyphs).toEqual(expect.arrayContaining(['line-none', 'ink-light', 'ink-dark', 'ink-black']));
    for (const g of glyphs) {
      expect(existsSync(join(ASSETS, 'glyphs', `${g}.png`))).toBe(true);
    }
  });

  it.each(['line-none', 'ink-light', 'ink-dark', 'ink-black'])('renders %s at 44 x 28 like the others', g => {
    // PNG IHDR: width and height are big-endian at bytes 16 and 20.
    const png = readFileSync(join(ASSETS, 'glyphs', `${g}.png`));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([44, 28]);
  });
});
