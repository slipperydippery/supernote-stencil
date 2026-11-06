import type { PageCtx, Settings } from '../src/device';
import type { Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE } from '../src/render/style';

/** Shared state behind the jest.mock('../src/device') factory in the UI suites. */
export const device = {
  ctx: { notePath: '/note/a.note', page: 1, width: 1920, height: 2560, unit: 1 } as PageCtx,
  settings: { style: DEFAULT_STYLE, lastShape: null, tab: 'basic' } as Settings,
  log: [] as string[],
};

export function deviceMock() {
  return {
    DEFAULT_SETTINGS: { style: DEFAULT_STYLE, lastShape: null, tab: 'basic' },
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
    selectRect: jest.fn(() => {
      device.log.push('selectRect');
      return Promise.resolve();
    }),
    closeView: jest.fn(() => {
      device.log.push('closeView');
      return Promise.resolve();
    }),
    readLasso: jest.fn(() =>
      Promise.resolve({ rect: { left: 0, top: 0, right: 0, bottom: 0 }, recipe: null as Recipe | null, count: 3 }),
    ),
  };
}
