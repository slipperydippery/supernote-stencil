import type { LastPlacement, PageCtx, Settings } from '../src/device';
import type { Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE, TONE_COVERAGE } from '../src/render/style';

/** Shared state behind the jest.mock('../src/device') factory in the UI suites. */
export const device = {
  ctx: { notePath: '/note/a.note', page: 1, width: 1920, height: 2560, unit: 1 } as PageCtx,
  settings: { style: DEFAULT_STYLE, lastShape: null, tab: 'basic', armOnOpen: true, coverage: TONE_COVERAGE, wrapPadding: 24 } as Settings,
  log: [] as string[],
  lastPlacement: null as LastPlacement | null,
};

export function deviceMock() {
  return {
    DEFAULT_SETTINGS: { style: DEFAULT_STYLE, lastShape: null, tab: 'basic', armOnOpen: true, coverage: TONE_COVERAGE, wrapPadding: 24 },
    currentPage: jest.fn(() => Promise.resolve(device.ctx)),
    loadSettings: jest.fn(() => Promise.resolve(device.settings)),
    saveSettings: jest.fn(() => {
      device.log.push('saveSettings');
      return Promise.resolve();
    }),
    insertPlan: jest.fn((_ctx: unknown, plan: { bounds: unknown }) => {
      device.log.push('insertPlan');
      return Promise.resolve(plan.bounds);
    }),
    replaceLasso: jest.fn((_ctx: unknown, plan: { bounds: unknown }) => {
      device.log.push('replaceLasso');
      return Promise.resolve(plan.bounds);
    }),
    replaceWhole: jest.fn((_ctx: unknown, _tag: string, _n: number, _box: unknown, plan: { bounds: unknown }) => {
      device.log.push('replaceWhole');
      return Promise.resolve(plan.bounds);
    }),
    replaceElements: jest.fn((_ctx: unknown, _nums: number[], plan: { bounds: unknown }) => {
      device.log.push('replaceElements');
      return Promise.resolve(plan.bounds);
    }),
    deleteLasso: jest.fn(() => {
      device.log.push('deleteLasso');
      return Promise.resolve();
    }),
    deleteElements: jest.fn(() => {
      device.log.push('deleteElements');
      return Promise.resolve();
    }),
    deleteWhole: jest.fn(() => {
      device.log.push('deleteWhole');
      return Promise.resolve();
    }),
    undoPlacement: jest.fn(() => {
      device.log.push('undoPlacement');
      return Promise.resolve();
    }),
    loadLastPlacement: jest.fn(() => Promise.resolve(device.lastPlacement)),
    recordPlacement: jest.fn(() => {
      device.log.push('recordPlacement');
      return Promise.resolve();
    }),
    clearLastPlacement: jest.fn(() => {
      device.log.push('clearLastPlacement');
      return Promise.resolve();
    }),
    forgetPlacement: jest.fn(() => {
      device.log.push('forgetPlacement');
      return Promise.resolve();
    }),
    selectRect: jest.fn(() => {
      device.log.push('selectRect');
      return Promise.resolve();
    }),
    closeView: jest.fn(() => {
      device.log.push('closeView');
      return Promise.resolve();
    }),
    readLasso: jest.fn(() =>
      Promise.resolve({
        rect: { left: 0, top: 0, right: 0, bottom: 0 },
        liveRect: { left: 0, top: 0, right: 0, bottom: 0 },
        recipe: null as Recipe | null,
        count: 3,
        recipes: 0,
        shapes: 0,
        own: null as { nums: number[]; box: { left: number; top: number; right: number; bottom: number }; tag?: string } | null,
      }),
    ),
  };
}
