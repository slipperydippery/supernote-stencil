import { FileUtils, PluginManager } from 'sn-plugin-lib';
import { COVERAGE_MAX, COVERAGE_MIN, DEFAULT_STYLE, readStyle, STYLE_KEYS, TONE_COVERAGE, TONES, type Style, type Tone } from '../render/style';
import { FAMILIES, readShapeId, type Family, type ShapeId } from '../shapes';
import { PADDING_STEPS, WRAP_PADDING } from '../ui/wrap';

/** `coverage` is the hatch ink coverage per tone in percent, `wrapPadding` the wrap margin in Manta px. */
export type Settings = { style: Style; lastShape: ShapeId | null; tab: Family; armOnOpen: boolean; coverage: Record<Tone, number>; wrapPadding: number };

export const DEFAULT_SETTINGS: Settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic', armOnOpen: true, coverage: TONE_COVERAGE, wrapPadding: WRAP_PADDING };

type Key = keyof Settings;
const KEYS: Key[] = ['style', 'lastShape', 'tab', 'armOnOpen', 'coverage', 'wrapPadding'];

function encode(s: Settings, key: Key): string {
  switch (key) {
    case 'style':
      // Plain words: the value is a directory name, so keep it to [a-z-] rather than encoded JSON.
      return STYLE_KEYS.map(k => s.style[k]).join('-');
    case 'lastShape':
      return s.lastShape ?? 'none';
    case 'tab':
      return s.tab;
    case 'armOnOpen':
      return s.armOnOpen ? 'on' : 'off';
    case 'coverage':
      return TONES.map(t => s.coverage[t]).join('-');
    case 'wrapPadding':
      return String(s.wrapPadding);
  }
}

function decode(out: Settings, key: Key, raw: string): void {
  switch (key) {
    case 'style': {
      const parts = raw.split('-');
      // Six words today; five from a version without ink, four from one without tone too. readStyle upgrades both.
      const keys =
        parts.length === STYLE_KEYS.length ? STYLE_KEYS
        : parts.length === 5 ? STYLE_KEYS.filter(k => k !== 'ink')
        : parts.length === 4 ? STYLE_KEYS.filter(k => k !== 'tone' && k !== 'ink')
        : null;
      const style = keys ? readStyle(Object.fromEntries(keys.map((k, i) => [k, parts[i]]))) : null;
      out.style = style ?? { ...DEFAULT_STYLE };
      return;
    }
    case 'lastShape':
      out.lastShape = readShapeId(raw);
      return;
    case 'tab':
      out.tab = FAMILIES.includes(raw as Family) ? (raw as Family) : DEFAULT_SETTINGS.tab;
      return;
    case 'armOnOpen':
      out.armOnOpen = raw !== 'off';
      return;
    case 'coverage': {
      // All three or none: a half-read record would mix the user's tones with defaults.
      const parts = raw.split('-').map(Number);
      const ok = parts.length === TONES.length && parts.every(c => Number.isInteger(c) && c >= COVERAGE_MIN && c <= COVERAGE_MAX);
      out.coverage = ok ? (Object.fromEntries(TONES.map((t, i) => [t, parts[i]])) as Record<Tone, number>) : { ...TONE_COVERAGE };
      return;
    }
    case 'wrapPadding': {
      const n = Number(raw);
      out.wrapPadding = (PADDING_STEPS as readonly number[]).includes(n) ? n : WRAP_PADDING;
      return;
    }
  }
}

// The SDK exposes no key/value or file-write API, only directory operations.
// Each setting is stored as an empty directory `settings/<key>/<encoded value>`
// inside the plugin's private dir, which needs no user permission.
async function settingsDir(): Promise<string | null> {
  const base = await PluginManager.getPluginDirPath();
  return base ? `${base}/settings` : null;
}

/**
 * The SDK types listFiles as string[], but on a Manta it returns
 * `{ type, path }` objects; accept both.
 */
function leafName(entry: unknown): string {
  const path = typeof entry === 'string' ? entry : String((entry as { path?: unknown } | null)?.path ?? '');
  return path.replace(/\/+$/, '').split('/').pop() ?? '';
}

/** The stored value of one key, or null when nothing is stored or the device refuses to read. */
export async function readKey(key: string): Promise<string | null> {
  try {
    const dir = await settingsDir();
    if (!dir || !(await FileUtils.exists(`${dir}/${key}`))) {
      return null;
    }
    const entries: unknown[] = (await FileUtils.listFiles(`${dir}/${key}`)) ?? [];
    return entries.length > 0 ? decodeURIComponent(leafName(entries[0])) : null;
  } catch (e) {
    console.warn(`readKey: ${key} unreadable`, e);
    return null;
  }
}

/** Stores `value` under `key`, or removes the key when `value` is null. Errors are logged, not thrown. */
export async function writeKey(key: string, value: string | null): Promise<void> {
  try {
    const dir = await settingsDir();
    if (!dir) {
      return;
    }
    await FileUtils.makeDir(dir);
    const keyDir = `${dir}/${key}`;
    if (await FileUtils.exists(keyDir)) {
      await FileUtils.deleteDir(keyDir);
    }
    if (value !== null) {
      await FileUtils.makeDir(keyDir);
      await FileUtils.makeDir(`${keyDir}/${encodeURIComponent(value)}`);
    }
  } catch (e) {
    console.warn(`writeKey: ${key} not saved`, e);
  }
}

export async function loadSettings(): Promise<Settings> {
  const settings: Settings = { ...DEFAULT_SETTINGS, style: { ...DEFAULT_STYLE }, coverage: { ...TONE_COVERAGE } };
  for (const key of KEYS) {
    const raw = await readKey(key);
    if (raw !== null) {
      decode(settings, key, raw);
    }
  }
  return settings;
}

/** One key per write, so a key the device refuses cannot take the others with it. */
export async function saveSettings(s: Settings): Promise<void> {
  for (const key of KEYS) {
    await writeKey(key, encode(s, key));
  }
}
