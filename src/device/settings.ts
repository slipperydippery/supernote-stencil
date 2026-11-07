import { FileUtils, PluginManager } from 'sn-plugin-lib';
import { DEFAULT_STYLE, GAP_STEPS, readStyle, STYLE_KEYS, TONE_GAP, TONES, type Style, type Tone } from '../render/style';
import { FAMILIES, SHAPES, type Family, type ShapeId } from '../shapes';
import { PADDING_STEPS, WRAP_PADDING } from '../ui/wrap';

/** `gaps` is the hatch spacing per tone and `wrapPadding` the wrap margin, both in Manta px. */
export type Settings = { style: Style; lastShape: ShapeId | null; tab: Family; armOnOpen: boolean; gaps: Record<Tone, number>; wrapPadding: number };

export const DEFAULT_SETTINGS: Settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic', armOnOpen: true, gaps: TONE_GAP, wrapPadding: WRAP_PADDING };

type Key = keyof Settings;
const KEYS: Key[] = ['style', 'lastShape', 'tab', 'armOnOpen', 'gaps', 'wrapPadding'];

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
    case 'gaps':
      return TONES.map(t => s.gaps[t]).join('-');
    case 'wrapPadding':
      return String(s.wrapPadding);
  }
}

function decode(out: Settings, key: Key, raw: string): void {
  switch (key) {
    case 'style': {
      const parts = raw.split('-');
      // Five words today; four from a version without tone, which readStyle upgrades.
      const keys = parts.length === STYLE_KEYS.length ? STYLE_KEYS : parts.length === 4 ? STYLE_KEYS.filter(k => k !== 'tone') : null;
      const style = keys ? readStyle(Object.fromEntries(keys.map((k, i) => [k, parts[i]]))) : null;
      out.style = style ?? { ...DEFAULT_STYLE };
      return;
    }
    case 'lastShape':
      out.lastShape = Object.prototype.hasOwnProperty.call(SHAPES, raw) ? (raw as ShapeId) : null;
      return;
    case 'tab':
      out.tab = FAMILIES.includes(raw as Family) ? (raw as Family) : DEFAULT_SETTINGS.tab;
      return;
    case 'armOnOpen':
      out.armOnOpen = raw !== 'off';
      return;
    case 'gaps': {
      // All three or none: a half-read record would mix the user's tones with defaults.
      const parts = raw.split('-').map(Number);
      const ok = parts.length === TONES.length && parts.every(g => (GAP_STEPS as readonly number[]).includes(g));
      out.gaps = ok ? (Object.fromEntries(TONES.map((t, i) => [t, parts[i]])) as Record<Tone, number>) : { ...TONE_GAP };
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

export async function loadSettings(): Promise<Settings> {
  const settings: Settings = { ...DEFAULT_SETTINGS, style: { ...DEFAULT_STYLE }, gaps: { ...TONE_GAP } };
  try {
    const dir = await settingsDir();
    if (!dir || !(await FileUtils.exists(dir))) {
      return settings;
    }
    for (const key of KEYS) {
      try {
        const entries: unknown[] = (await FileUtils.listFiles(`${dir}/${key}`)) ?? [];
        if (entries.length > 0) {
          decode(settings, key, decodeURIComponent(leafName(entries[0])));
        }
      } catch (e) {
        console.warn(`loadSettings: ${key} unreadable, using default`, e);
      }
    }
  } catch (e) {
    console.warn('loadSettings failed, using defaults', e);
  }
  return settings;
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    const dir = await settingsDir();
    if (!dir) {
      return;
    }
    await FileUtils.makeDir(dir);
    // One key per try, so a key the device refuses cannot take the others with it.
    for (const key of KEYS) {
      try {
        const keyDir = `${dir}/${key}`;
        if (await FileUtils.exists(keyDir)) {
          await FileUtils.deleteDir(keyDir);
        }
        await FileUtils.makeDir(keyDir);
        await FileUtils.makeDir(`${keyDir}/${encodeURIComponent(encode(s, key))}`);
      } catch (e) {
        console.warn(`saveSettings: ${key} not saved`, e);
      }
    }
  } catch (e) {
    console.warn('saveSettings failed', e);
  }
}
