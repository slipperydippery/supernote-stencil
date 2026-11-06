import { FileUtils, PluginManager } from 'sn-plugin-lib';
import { DEFAULT_STYLE, isStyle, type Style } from '../render/style';
import { FAMILIES, SHAPES, type Family, type ShapeId } from '../shapes';

export type Settings = { style: Style; lastShape: ShapeId | null; tab: Family };

export const DEFAULT_SETTINGS: Settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic' };

type Key = keyof Settings;
const KEYS: Key[] = ['style', 'lastShape', 'tab'];

function encode(s: Settings, key: Key): string {
  switch (key) {
    case 'style':
      return JSON.stringify(s.style);
    case 'lastShape':
      return s.lastShape ?? 'none';
    case 'tab':
      return s.tab;
  }
}

function decode(out: Settings, key: Key, raw: string): void {
  switch (key) {
    case 'style': {
      let style: unknown = null;
      try {
        style = JSON.parse(raw);
      } catch {}
      out.style = isStyle(style) ? style : { ...DEFAULT_STYLE };
      return;
    }
    case 'lastShape':
      out.lastShape = Object.prototype.hasOwnProperty.call(SHAPES, raw) ? (raw as ShapeId) : null;
      return;
    case 'tab':
      out.tab = FAMILIES.includes(raw as Family) ? (raw as Family) : DEFAULT_SETTINGS.tab;
      return;
  }
}

// The SDK exposes no key/value or file-write API, only directory operations.
// Each setting is stored as an empty directory `settings/<key>/<encoded value>`
// inside the plugin's private dir, which needs no user permission.
async function settingsDir(): Promise<string | null> {
  const base = await PluginManager.getPluginDirPath();
  return base ? `${base}/settings` : null;
}

export async function loadSettings(): Promise<Settings> {
  const settings: Settings = { ...DEFAULT_SETTINGS, style: { ...DEFAULT_STYLE } };
  try {
    const dir = await settingsDir();
    if (!dir || !(await FileUtils.exists(dir))) {
      return settings;
    }
    for (const key of KEYS) {
      const entries = (await FileUtils.listFiles(`${dir}/${key}`)) ?? [];
      if (entries.length === 0) {
        continue;
      }
      let raw: string;
      try {
        raw = decodeURIComponent(entries[0].slice(entries[0].lastIndexOf('/') + 1));
      } catch {
        continue;
      }
      decode(settings, key, raw);
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
    for (const key of KEYS) {
      const keyDir = `${dir}/${key}`;
      if (await FileUtils.exists(keyDir)) {
        await FileUtils.deleteDir(keyDir);
      }
      await FileUtils.makeDir(keyDir);
      await FileUtils.makeDir(`${keyDir}/${encodeURIComponent(encode(s, key))}`);
    }
  } catch (e) {
    console.warn('saveSettings failed', e);
  }
}
