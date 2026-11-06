import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const sources = [...files(join(root, 'src')), join(root, 'App.tsx'), join(root, 'index.js')].map(p => relative(root, p));
const imports = (f: string) => [...readFileSync(join(root, f), 'utf8').matchAll(/from '([^']+)'/g)].map(m => m[1]);

it('the spike modules and shims are gone and nothing imports them', () => {
  const gone = ['src/spikes.ts', 'src/handdrawn.ts', 'src/strokes.ts', 'src/sdk.ts', 'src/device/spikeCompat.ts', 'src/device/contracts.ts', 'src/device/recipe.ts'];
  expect(gone.filter(f => existsSync(join(root, f)))).toEqual([]);
  const bad = /\/(spikes|handdrawn|strokes|spikeCompat|contracts)$|^\.\/(src\/)?sdk$|^\.\/recipe$/;
  const hits = sources.flatMap(f => imports(f).filter(i => bad.test(i) && !(f.startsWith('src/device/') && i === './sdk')).map(i => `${f}: ${i}`));
  expect(hits).toEqual([]);
});

it('only src/device imports sn-plugin-lib, apart from the entry point', () => {
  const hits = sources.filter(f => f !== 'index.js' && !f.startsWith('src/device/') && imports(f).includes('sn-plugin-lib'));
  expect(hits).toEqual([]);
});
