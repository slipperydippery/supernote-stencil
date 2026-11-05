import { FileUtils, PluginManager } from 'sn-plugin-lib';
import type { Family, ShapeId, Style } from './contracts';
import { FAMILY_IDS, isStyle, SHAPE_IDS } from './recipe';

export type Settings = { style: Style; lastShape: ShapeId | null; tab: Family };

// Local copy of PR 1's DEFAULT_STYLE until PR 3 imports `src/render/style`.
const DEFAULT_STYLE: Style = { weight: 'normal', line: 'solid', fill: 'none', look: 'clean' };

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
      out.style = isStyle(style) ? style : DEFAULT_STYLE;
      return;
    }
    case 'lastShape':
      out.lastShape = SHAPE_IDS.includes(raw as ShapeId) ? (raw as ShapeId) : null;
      return;
    case 'tab':
      out.tab = FAMILY_IDS.includes(raw as Family) ? (raw as Family) : DEFAULT_SETTINGS.tab;
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
  const settings: Settings = { ...DEFAULT_SETTINGS };
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
