import type { Plan } from '../src/render/plan';
import type { Recipe } from '../src/render/recipe';

type Fake = {
  log: string[];
  created: any[];
  lassoElements: any[];
  lassoRect: { left: number; top: number; right: number; bottom: number };
  lassoPreviewRect: { left: number; top: number; right: number; bottom: number };
  lassoPreviewFails: boolean;
  insertFails: boolean;
  dirs: Set<string>;
};

var mockState: Fake;

function mockOk(result: unknown) {
  return Promise.resolve({ success: true, result, error: null });
}

jest.mock('sn-plugin-lib', () => {
  let uuid = 0;
  const record = (name: string) => mockState.log.push(name);
  return {
    Element: { TYPE_STROKE: 0, TYPE_GEO: 700 },
    PluginCommAPI: {
      createElement: jest.fn((type: number) => {
        record(`createElement:${type}`);
        const el: any = { uuid: `u${++uuid}`, type, userData: '', geometry: type === 700 ? { penWidth: 0 } : null };
        if (type === 0) {
          el.stroke = { points: { setRange: jest.fn(() => Promise.resolve(true)) }, pressures: { setRange: jest.fn(() => Promise.resolve(true)) } };
        }
        mockState.created.push(el);
        return mockOk(el);
      }),
      insertPageElements: jest.fn((elements: any[], page: number) => {
        record('insertPageElements');
        if (mockState.insertFails) {
          return Promise.resolve({ success: false, result: null, error: { code: 1, message: 'boom' } });
        }
        return mockOk({ elements: elements.map(e => ({ ...e })), page });
      }),
      recycleElement: jest.fn((id: string) => record(`recycle:${id}`)),
      clearElementCache: jest.fn(() => record('clearElementCache')),
      getLassoElements: jest.fn(() => {
        record('getLassoElements');
        return mockOk(mockState.lassoElements);
      }),
      getLassoRect: jest.fn(() => {
        record('getLassoRect');
        return mockOk(mockState.lassoRect);
      }),
      generateLassoPreview: jest.fn((imagePath: string) => {
        record('generateLassoPreview');
        if (mockState.lassoPreviewFails) {
          return Promise.resolve({ success: false, result: null, error: { code: 1, message: 'boom' } });
        }
        return mockOk({ imagePath, rect: mockState.lassoPreviewRect, rotateDegree: 0 });
      }),
      setLassoBoxState: jest.fn((state: number) => {
        record(`setLassoBoxState:${state}`);
        return mockOk(true);
      }),
      deleteLassoElements: jest.fn(() => {
        record('deleteLassoElements');
        return mockOk(true);
      }),
      // Like the SDK's RectSchema: integer coordinates only.
      lassoElements: jest.fn((r: Record<string, number>) => {
        record('lassoElements');
        if (Object.values(r).some(v => !Number.isInteger(v))) {
          return Promise.resolve({ success: false, result: null, error: { code: 101, message: 'lassoElements.left must be an integer' } });
        }
        return mockOk(true);
      }),
      reloadFile: jest.fn(() => record('reloadFile')),
      getCurrentFilePath: jest.fn(() => mockOk('/note/a.note')),
      getCurrentPageNum: jest.fn(() => mockOk(2)),
    },
    PluginNoteAPI: { saveCurrentNote: jest.fn(() => record('saveCurrentNote')) },
    PluginFileAPI: {
      getPageSize: jest.fn(() => {
        record('getPageSize');
        return mockOk({ width: 1920, height: 2560 });
      }),
    },
    PluginManager: {
      closePluginView: jest.fn(
        () =>
          new Promise(resolve =>
            setTimeout(() => {
              record('closePluginView');
              resolve(true);
            }, 10),
          ),
      ),
      getPluginDirPath: jest.fn(() => Promise.resolve('/plugin')),
      hasPermission: jest.fn((p: string) => {
        record(`hasPermission:${p}`);
        return Promise.resolve(1);
      }),
      requestPermission: jest.fn(() => Promise.resolve(1)),
    },
    FileUtils: {
      exists: jest.fn((p: string) => Promise.resolve([...mockState.dirs].some(d => d === p || d.startsWith(`${p}/`)))),
      makeDir: jest.fn((p: string) => {
        mockState.dirs.add(p);
        return Promise.resolve(true);
      }),
      deleteDir: jest.fn((p: string) => {
        for (const d of [...mockState.dirs]) {
          if (d === p || d.startsWith(`${p}/`)) {
            mockState.dirs.delete(d);
          }
        }
        return Promise.resolve(true);
      }),
      // What a Manta returns, not the string[] the SDK's type declares.
      listFiles: jest.fn((p: string) =>
        Promise.resolve(
          [...mockState.dirs].filter(d => d.startsWith(`${p}/`) && !d.slice(p.length + 1).includes('/')).map(path => ({ type: 0, path })),
        ),
      ),
    },
  };
});

import { PluginCommAPI } from 'sn-plugin-lib';
import { currentPage, DEFAULT_SETTINGS, insertPlan, loadSettings, readLasso, replaceLasso, saveSettings, selectRect } from '../src/device';
import type { Settings } from '../src/device';

const ctx = { notePath: '/note/a.note', page: 2, width: 1920, height: 2560, unit: 1 };
const recipe: Recipe = { v: 1, shape: 'rectangle', style: { weight: 'normal', line: 'solid', fill: 'none', look: 'hand' }, seed: 7 };
const tag = '{"v":1,"shape":"rectangle","style":{"weight":"normal","line":"solid","fill":"none","look":"hand"},"seed":7}';

const plan: Plan = {
  strokes: [
    { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], pressures: [800, 900], penType: 16, penColor: 0, thickness: 600.001 },
    { points: [{ x: 10, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 20 }], pressures: [800, 900, 1000], penType: 16, penColor: 0, thickness: 600.001 },
  ],
  geometries: [
    {
      type: 'GEO_polygon',
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }],
      ellipseCenterPoint: null,
      ellipseMajorAxisRadius: 0,
      ellipseMinorAxisRadius: 0,
      ellipseAngle: 0,
      penType: 10,
      penColor: 0,
      penWidth: 600.001,
    },
  ],
  bounds: { left: 0, top: 0, right: 10, bottom: 20 },
};

beforeEach(() => {
  mockState = {
    log: [],
    created: [],
    lassoElements: [],
    lassoRect: { left: 100, top: 200, right: 300, bottom: 400 },
    lassoPreviewRect: { left: 100, top: 200, right: 300, bottom: 400 },
    lassoPreviewFails: false,
    insertFails: false,
    dirs: new Set(),
  };
  jest.clearAllMocks();
});

afterEach(() => {
  // Scenario 8: no save or reload around any device call.
  expect(mockState.log).not.toContain('saveCurrentNote');
  expect(mockState.log).not.toContain('reloadFile');
});

describe('insertPlan', () => {
  it('creates strokes then geometry, tags every element, inserts once and recycles all', async () => {
    const box = await insertPlan(ctx, plan, recipe);
    expect(box).toEqual(plan.bounds);
    expect(mockState.log.filter(l => l.startsWith('createElement'))).toEqual(['createElement:0', 'createElement:0', 'createElement:700']);
    expect(mockState.created.map(e => e.userData)).toEqual([tag, tag, tag]);
    const insert = (PluginCommAPI.insertPageElements as jest.Mock).mock.calls;
    expect(insert).toHaveLength(1);
    expect(insert[0][0]).toEqual(mockState.created);
    expect(insert[0][1]).toBe(2);
    expect(mockState.log.filter(l => l.startsWith('recycle'))).toHaveLength(3);
    const geo = mockState.created[2];
    expect(geo.geometry).toMatchObject({ type: 'GEO_polygon', penType: 10, penWidth: 600.001, showLassoAfterInsert: false });
    expect(geo.thickness).toBe(600.001);
  });

  it('recycles every created element when insertPageElements rejects', async () => {
    mockState.insertFails = true;
    await expect(insertPlan(ctx, plan, recipe)).rejects.toThrow('insertPageElements: boom');
    expect(mockState.log.filter(l => l.startsWith('recycle'))).toHaveLength(3);
  });

  it('writes points and pressures through the accessors', async () => {
    await insertPlan(ctx, plan, recipe);
    plan.strokes.forEach((s, i) => {
      const el = mockState.created[i];
      expect(el.stroke.points.setRange).toHaveBeenCalledWith(0, s.points.length - 1, s.points);
      expect(el.stroke.pressures.setRange).toHaveBeenCalledWith(0, s.pressures.length - 1, s.pressures);
      expect(el.stroke.penType).toBe(16);
      expect(el.thickness).toBe(600.001);
      expect(el.pageNum).toBe(2);
    });
    for (const k of ['contoursSrc', 'angles']) {
      expect(mockState.created[0]).not.toHaveProperty(k);
    }
  });

  it('gives integer widths a fractional part', async () => {
    const intPlan: Plan = {
      ...plan,
      strokes: [{ ...plan.strokes[0], thickness: 600 }],
      geometries: [{ ...plan.geometries[0], penWidth: 1000 }],
    };
    await insertPlan(ctx, intPlan, recipe);
    expect(mockState.created[0].thickness).toBe(600.001);
    expect(mockState.created[1].thickness).toBe(1000.001);
    expect(mockState.created[1].geometry.penWidth).toBe(1000.001);
  });
});

describe('readLasso', () => {
  it('returns the first valid recipe, the count, the recipe count, and both rects', async () => {
    mockState.lassoElements = [
      { uuid: 'a', userData: '' },
      { uuid: 'b', userData: tag },
    ];
    const res = await readLasso();
    expect(res).toEqual({ rect: mockState.lassoRect, liveRect: mockState.lassoPreviewRect, recipe, count: 2, recipes: 1 });
    expect(mockState.log[0]).toBe('clearElementCache');
    expect(mockState.log).toEqual(expect.arrayContaining(['recycle:a', 'recycle:b']));
  });

  it('ignores malformed tags', async () => {
    mockState.lassoElements = [
      { uuid: 'a', userData: '{"v":2}' },
      { uuid: 'b', userData: 'hello' },
      { uuid: 'c', userData: tag.replace('"hand"', '"sketchy"') },
    ];
    const res = await readLasso();
    expect(res.recipe).toBeNull();
    expect(res.count).toBe(3);
    expect(res.recipes).toBe(0);
  });

  it('counts every tagged element, not just the first', async () => {
    mockState.lassoElements = [
      { uuid: 'a', userData: tag },
      { uuid: 'b', userData: tag },
      { uuid: 'c', userData: tag },
      { uuid: 'd', userData: '' },
    ];
    const res = await readLasso();
    expect(res.count).toBe(4);
    expect(res.recipes).toBe(3);
    expect(res.recipe).toEqual(recipe);
  });

  it('returns the preview rect as liveRect, distinct from getLassoRect', async () => {
    mockState.lassoRect = { left: 0, top: 0, right: 100, bottom: 100 };
    mockState.lassoPreviewRect = { left: 0, top: 0, right: 150, bottom: 100 };
    const res = await readLasso();
    expect(res.rect).toEqual({ left: 0, top: 0, right: 100, bottom: 100 });
    expect(res.liveRect).toEqual({ left: 0, top: 0, right: 150, bottom: 100 });
  });

  it('falls back to rect when generateLassoPreview fails', async () => {
    mockState.lassoPreviewFails = true;
    const res = await readLasso();
    expect(res.liveRect).toEqual(res.rect);
  });
});

describe('replaceLasso', () => {
  it('deletes the selection before creating and inserting', async () => {
    await replaceLasso(ctx, plan, recipe);
    const order = mockState.log.filter(l => /^(deleteLassoElements|createElement|insertPageElements)/.test(l));
    expect(order).toEqual(['deleteLassoElements', 'createElement:0', 'createElement:0', 'createElement:700', 'insertPageElements']);
  });
});

describe('selectRect', () => {
  it('closes the plugin view before lassoing a rect grown by 6 px', async () => {
    await selectRect({ left: 100, top: 200, right: 300, bottom: 400 });
    expect(mockState.log).toEqual(['closePluginView', 'lassoElements']);
    expect(PluginCommAPI.lassoElements).toHaveBeenCalledWith({ left: 94, top: 194, right: 306, bottom: 406 });
  });

  it('keeps a selection that holds only the inserted elements', async () => {
    mockState.lassoElements = [{ uuid: 'a' }, { uuid: 'b' }];
    await selectRect({ left: 100, top: 200, right: 300, bottom: 400 }, 2);
    expect(mockState.log).toEqual(['closePluginView', 'lassoElements', 'clearElementCache', 'getLassoElements', 'recycle:a', 'recycle:b']);
  });

  it('drops a selection that also caught existing ink', async () => {
    mockState.lassoElements = [{ uuid: 'a' }, { uuid: 'b' }, { uuid: 'text' }];
    await selectRect({ left: 100, top: 200, right: 300, bottom: 400 }, 2);
    expect(mockState.log).toEqual(['closePluginView', 'lassoElements', 'clearElementCache', 'getLassoElements', 'recycle:a', 'recycle:b', 'recycle:text', 'setLassoBoxState:2']);
  });

  it('rounds a fractional rect outwards to whole pixels', async () => {
    await selectRect({ left: 100.4, top: 200.6, right: 300.2, bottom: 399.5 });
    expect(PluginCommAPI.lassoElements).toHaveBeenCalledWith({ left: 94, top: 194, right: 307, bottom: 406 });
  });
});

describe('currentPage', () => {
  it('asks for file permissions before reading the page size', async () => {
    const page = await currentPage();
    expect(page).toEqual({ notePath: '/note/a.note', page: 2, width: 1920, height: 2560, unit: 1 });
    expect(mockState.log).toEqual([
      'hasPermission:plugin.permission.FILE:READ',
      'hasPermission:plugin.permission.FILE:WRITE',
      'getPageSize',
    ]);
  });
});

describe('settings', () => {
  it('round-trips', async () => {
    const s: Settings = { style: { weight: 'thick', line: 'dashed', fill: 'hatch', look: 'hand' }, lastShape: 'decision', tab: 'flow', armOnOpen: false };
    await saveSettings(s);
    expect(await loadSettings()).toEqual(s);
    await saveSettings(DEFAULT_SETTINGS);
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('yields defaults when nothing is stored, without sharing the default style object', async () => {
    const s = await loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
    s.style.weight = 'thick';
    expect(DEFAULT_SETTINGS.style.weight).toBe('normal');
  });

  it('stores every value as a plain directory name', async () => {
    await saveSettings({ style: { weight: 'thick', line: 'dashed', fill: 'hatch', look: 'hand' }, lastShape: 'decision', tab: 'flow', armOnOpen: false });
    const leaves = [...mockState.dirs].filter(d => d.split('/').length === 5).sort();
    expect(leaves).toEqual(['/plugin/settings/armOnOpen/off', '/plugin/settings/lastShape/decision', '/plugin/settings/style/thick-dashed-hatch-hand', '/plugin/settings/tab/flow']);
  });

  it('saves the other keys when the device refuses one', async () => {
    const { FileUtils } = require('sn-plugin-lib');
    const real = FileUtils.makeDir.getMockImplementation();
    FileUtils.makeDir.mockImplementation((p: string) => (p.startsWith('/plugin/settings/style/') ? Promise.reject(new Error('EINVAL')) : real(p)));
    try {
      await saveSettings({ ...DEFAULT_SETTINGS, lastShape: 'circle', tab: 'arrow' });
    } finally {
      FileUtils.makeDir.mockImplementation(real);
    }
    expect(await loadSettings()).toEqual({ style: DEFAULT_SETTINGS.style, lastShape: 'circle', tab: 'arrow', armOnOpen: DEFAULT_SETTINGS.armOnOpen });
  });

  it('also reads plain path strings, with a trailing slash', async () => {
    const { FileUtils } = require('sn-plugin-lib');
    await saveSettings({ ...DEFAULT_SETTINGS, lastShape: 'circle' });
    const real = FileUtils.listFiles.getMockImplementation();
    FileUtils.listFiles.mockImplementation((p: string) => real(p).then((l: { path: string }[]) => l.map(e => `${e.path}/`)));
    try {
      expect((await loadSettings()).lastShape).toBe('circle');
    } finally {
      FileUtils.listFiles.mockImplementation(real);
    }
  });

  it('falls back to the default style on a corrupt value and keeps the other keys', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, lastShape: 'circle', tab: 'arrow' });
    for (const d of [...mockState.dirs]) {
      if (d.startsWith('/plugin/settings/style/')) {
        mockState.dirs.delete(d);
      }
    }
    mockState.dirs.add('/plugin/settings/style/thick-dashed');
    expect(await loadSettings()).toEqual({ style: DEFAULT_SETTINGS.style, lastShape: 'circle', tab: 'arrow', armOnOpen: DEFAULT_SETTINGS.armOnOpen });
  });

  it('round-trips armOnOpen off, and defaults an unrecognised value to on', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, armOnOpen: false });
    expect((await loadSettings()).armOnOpen).toBe(false);
    for (const d of [...mockState.dirs]) {
      if (d.startsWith('/plugin/settings/armOnOpen/')) {
        mockState.dirs.delete(d);
      }
    }
    mockState.dirs.add('/plugin/settings/armOnOpen/garbled');
    expect((await loadSettings()).armOnOpen).toBe(true);
  });
});
