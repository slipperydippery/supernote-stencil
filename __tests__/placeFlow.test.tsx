import React from 'react';
import { PixelRatio, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { device, deviceMock } from '../test/device-mock';
import { pressableNode } from '../test/helpers';

jest.mock('../src/device', () => require('../test/device-mock').deviceMock());
jest.mock('../src/render/plan', () => {
  const real = jest.requireActual('../src/render/plan');
  return { ...real, renderShape: jest.fn(real.renderShape) };
});

import * as dev from '../src/device';
import { renderShape } from '../src/render/plan';
import { DEFAULT_STYLE, hatchGap, TONE_COVERAGE } from '../src/render/style';
import { SHAPES } from '../src/shapes';
import PlaceFlow from '../src/ui/PlaceFlow';
import PlacementLayer from '../src/ui/PlacementLayer';

const mocked = dev as unknown as ReturnType<typeof deviceMock>;

async function open(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<PlaceFlow />);
  });
  return r;
}

const has = (r: ReactTestRenderer, testID: string) => r.root.findAllByProps({ testID }).length > 0;
const press = async (r: ReactTestRenderer, testID: string) => {
  await act(async () => {
    r.root.findAllByProps({ testID })[0].props.onPress();
  });
};
const layer = (r: ReactTestRenderer) => r.root.findAllByProps({ testID: 'placement-layer' })[0];
const onPlace = (r: ReactTestRenderer) => r.root.findByType(PlacementLayer).props.onPlace;
const ev = (x: number, y: number) => ({ nativeEvent: { pageX: x, pageY: y } });

async function gesture(r: ReactTestRenderer, from: [number, number], to: [number, number]) {
  await act(async () => {
    const l = layer(r);
    l.props.onResponderGrant(ev(...from));
    l.props.onResponderMove(ev(...to));
  });
  await act(async () => {
    layer(r).props.onResponderRelease(ev(...to));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PixelRatio, 'get').mockReturnValue(2);
  device.log = [];
  device.lastPlacement = null;
  device.settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic', armOnOpen: true, coverage: TONE_COVERAGE, wrapPadding: 24 };
});

it('opens the panel when nothing is remembered', async () => {
  const r = await open();
  expect(has(r, 'tab-basic')).toBe(true);
  expect(has(r, 'strip-preview')).toBe(false);
  expect(layer(r).props.pointerEvents).toBe('none');
});

it('opens the strip armed with the remembered shape', async () => {
  device.settings = { ...device.settings, lastShape: 'diamond' };
  const r = await open();
  expect(has(r, 'strip-icon-diamond')).toBe(true);
  expect(has(r, 'tab-basic')).toBe(false);
  expect(layer(r).props.pointerEvents).toBe('auto');
});

it('opens the panel instead, with the remembered shape pre-selected, when armOnOpen is off', async () => {
  device.settings = { ...device.settings, lastShape: 'diamond', armOnOpen: false };
  const r = await open();
  expect(has(r, 'strip-preview')).toBe(false);
  expect(r.root.findByProps({ testID: 'cell-diamond' }).props.accessibilityState).toEqual({ selected: true });
});

it('toggles and persists armOnOpen from the strip', async () => {
  device.settings = { ...device.settings, lastShape: 'diamond' };
  const r = await open();
  const toggle = r.root.findByProps({ testID: 'strip-arm-on-open' });
  expect(toggle.props.accessibilityState).toEqual({ checked: true });
  await act(async () => toggle.props.onPress());
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, lastShape: 'diamond', armOnOpen: false });
  expect(r.root.findByProps({ testID: 'strip-arm-on-open' }).props.accessibilityState).toEqual({ checked: false });
});

it('persists a tab tap and shows that family', async () => {
  const r = await open();
  await press(r, 'tab-flow');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, style: DEFAULT_STYLE, lastShape: null, tab: 'flow', armOnOpen: true });
  expect(has(r, 'cell-decision')).toBe(true);
  expect(has(r, 'cell-rectangle')).toBe(false);
});

it('arms the strip on pick and persists the shape', async () => {
  const r = await open();
  await press(r, 'tab-flow');
  await press(r, 'cell-decision');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, style: DEFAULT_STYLE, lastShape: 'decision', tab: 'flow', armOnOpen: true });
  expect(has(r, 'tab-flow')).toBe(false);
  expect(has(r, 'strip-icon-decision')).toBe(true);
});

describe('a remembered line none on pick', () => {
  const bare = { ...DEFAULT_STYLE, fill: 'solid', line: 'none' } as const;

  it('draws an arrow solid and persists that', async () => {
    device.settings = { ...device.settings, style: bare };
    const r = await open();
    await press(r, 'tab-arrow');
    await press(r, 'cell-arrow');
    expect(mocked.saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({ style: { ...bare, line: 'solid' }, lastShape: 'arrow' }));
  });

  it('keeps it for a rectangle', async () => {
    device.settings = { ...device.settings, style: bare };
    const r = await open();
    await press(r, 'cell-rectangle');
    expect(mocked.saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({ style: bare, lastShape: 'rectangle' }));
  });
});

it('persists a style chip in the strip and shows it selected', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await press(r, 'chip-line-dashed');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, style: { ...DEFAULT_STYLE, line: 'dashed' }, lastShape: 'rectangle', tab: 'basic', armOnOpen: true });
  expect(pressableNode(r, 'chip-line-dashed').props.accessibilityState).toEqual({ selected: true });
});

it('expands the panel from the strip preview', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await press(r, 'strip-preview');
  expect(has(r, 'tab-basic')).toBe(true);
  expect(r.root.findAllByProps({ testID: 'cell-rectangle' })[0].props.accessibilityState).toEqual({ selected: true });
});

it('places on tap at default size centred under the pen, then lassoes as the last call', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await gesture(r, [300, 400], [300, 400]);
  const [, plan, recipe] = mocked.insertPlan.mock.calls[0] as any[];
  const b = plan.bounds;
  expect((b.left + b.right) / 2).toBeCloseTo(600);
  expect((b.top + b.bottom) / 2).toBeCloseTo(800);
  expect((renderShape as jest.Mock).mock.calls[0][1]).toEqual({ left: 360, top: 680, right: 840, bottom: 920 });
  expect((renderShape as jest.Mock).mock.calls[0][3]).toBe(recipe.seed);
  expect(recipe).toMatchObject({ v: 1, shape: 'rectangle', style: DEFAULT_STYLE });
  expect(mocked.selectRect).toHaveBeenCalledWith(b, plan.strokes.length + plan.geometries.length);
  expect(device.log[device.log.length - 1]).toBe('selectRect');
  expect(has(r, 'strip-preview')).toBe(false);
});

it('records the placement after the insert and before the view closes', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await gesture(r, [300, 400], [300, 400]);
  const [, plan, recipe] = mocked.insertPlan.mock.calls[0] as any[];
  expect(mocked.recordPlacement).toHaveBeenCalledWith(device.ctx, recipe.seed, plan.strokes.length + plan.geometries.length, plan.bounds);
  expect(device.log).toEqual(['insertPlan', 'recordPlacement', 'selectRect']);
});

describe('undo last placement', () => {
  const RECORD = { note: 'n', page: 1, seed: 42, count: 3, box: { left: 100, top: 100, right: 300, bottom: 200 } };

  it('shows no undo button when nothing is recorded for this page', async () => {
    const r = await open();
    expect(has(r, 'panel-undo')).toBe(false);
  });

  it('clears the record, then removes the recorded shape, from the panel', async () => {
    device.lastPlacement = RECORD;
    const r = await open();
    expect(mocked.loadLastPlacement).toHaveBeenCalledWith(device.ctx);
    await press(r, 'panel-undo');
    expect(mocked.undoPlacement).toHaveBeenCalledWith(device.ctx, RECORD);
    expect(device.log).toEqual(['clearLastPlacement', 'undoPlacement']);
    expect(has(r, 'panel-undo')).toBe(false);
  });

  it('waits for a pending settings save first', async () => {
    device.lastPlacement = RECORD;
    let release!: () => void;
    mocked.saveSettings.mockImplementationOnce(() => new Promise<void>(res => (release = () => { device.log.push('saveSettings'); res(); })));
    const r = await open();
    await press(r, 'tab-flow');
    await press(r, 'panel-undo');
    expect(mocked.undoPlacement).not.toHaveBeenCalled();
    await act(async () => release());
    expect(device.log).toEqual(['saveSettings', 'clearLastPlacement', 'undoPlacement']);
  });

  it('shows the refusal when the shape is not found as recorded', async () => {
    device.lastPlacement = RECORD;
    mocked.undoPlacement.mockImplementationOnce(() => Promise.reject(new Error("the lasso caught 1 of the shape's 3 elements; nothing was changed")));
    const r = await open();
    await press(r, 'panel-undo');
    expect(JSON.stringify(r.toJSON())).toContain('nothing was changed');
  });
});

it('renders a drag into the swept box', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  let r = await open();
  await gesture(r, [100, 100], [400, 250]);
  expect((renderShape as jest.Mock).mock.calls[0][1]).toEqual({ left: 200, top: 200, right: 800, bottom: 500 });

  device.settings = { ...device.settings, lastShape: 'square' };
  r = await open();
  await gesture(r, [100, 100], [400, 250]);
  expect((renderShape as jest.Mock).mock.calls[1][1]).toEqual({ left: 350, top: 200, right: 650, bottom: 500 });
});

async function dragPreview(shape: string, from: [number, number], to: [number, number]) {
  device.settings = { ...device.settings, lastShape: shape as any };
  const r = await open();
  await act(async () => {
    layer(r).props.onResponderGrant(ev(...from));
    layer(r).props.onResponderMove(ev(...to));
  });
  const band = r.root.findAllByProps({ testID: 'rubber-band' }).find(n => typeof n.type !== 'string')!;
  // One axis-aligned rect per node: {left, top, width, height}, centre in dp.
  return band.findAll(n => n.type === View && n.props.style && !n.props.testID).map(n => {
    const st = Object.assign({}, ...[n.props.style].flat(Infinity));
    return { x: st.left + st.width / 2, y: st.top + st.height / 2, w: st.width, h: st.height };
  });
}

it('previews the armed shape in the box it will be rendered into while dragging', async () => {
  // Square: a dp drag (100, 100)–(400, 250) fits to page (350, 200)–(650, 500), dp (175, 100)–(325, 250).
  // Every edge is axis-aligned, so each is still exactly one rect, as before the diagonal-preview fix.
  const square = await dragPreview('square', [100, 100], [400, 250]);
  expect(square).toHaveLength(4);
  for (const c of square) {
    const onEdge = [175, 325].some(x => Math.abs(c.x - x) < 1e-6) || [100, 250].some(y => Math.abs(c.y - y) < 1e-6);
    expect(onEdge).toBe(true);
  }
  // Diamond: every edge is diagonal, so PlacementLayer's live preview approximates each as a staircase
  // of several axis-aligned rects instead of one rotated one (rotated views garble under the device's
  // partial-refresh pen tracking — see ShapePreview). More rects than plain edges, none of them rotated.
  const diamond = await dragPreview('diamond', [100, 100], [400, 250]);
  expect(diamond.length).toBeGreaterThan(4);
  expect(diamond.every(c => Math.min(c.w, c.h) === 2)).toBe(true);
});

it('clears the preview when the pen comes back inside the tap threshold', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await act(async () => {
    layer(r).props.onResponderGrant(ev(100, 100));
    layer(r).props.onResponderMove(ev(300, 200));
  });
  expect(has(r, 'rubber-band')).toBe(true);
  await act(async () => {
    layer(r).props.onResponderMove(ev(103, 102));
  });
  expect(has(r, 'rubber-band')).toBe(false);
});

it('treats a small drag as a tap', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await gesture(r, [300, 400], [303, 404]);
  expect((renderShape as jest.Mock).mock.calls[0][1]).toEqual({ left: 360, top: 680, right: 840, bottom: 920 });
});

it('ignores a second placement while the first insert is pending', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  let finish!: (b: unknown) => void;
  mocked.insertPlan.mockImplementationOnce(() => new Promise(res => (finish = res)));
  const r = await open();
  await act(async () => {
    onPlace(r)({ left: 600, top: 800, right: 600, bottom: 800 }, 'tap');
    onPlace(r)({ left: 100, top: 100, right: 100, bottom: 100 }, 'tap');
  });
  expect(mocked.insertPlan).toHaveBeenCalledTimes(1);
  await act(async () => finish({ left: 0, top: 0, right: 1, bottom: 1 }));
  expect(mocked.selectRect).toHaveBeenCalledTimes(1);
});

it('finishes pending settings saves before inserting', async () => {
  let release!: () => void;
  mocked.saveSettings.mockImplementationOnce(() => new Promise<void>(res => (release = () => { device.log.push('saveSettings'); res(); })));
  const r = await open();
  await press(r, 'cell-rectangle');
  await act(async () => {
    onPlace(r)({ left: 600, top: 800, right: 600, bottom: 800 }, 'tap');
  });
  expect(mocked.insertPlan).not.toHaveBeenCalled();
  await act(async () => release());
  expect(device.log).toEqual(['saveSettings', 'insertPlan', 'recordPlacement', 'selectRect']);
});

describe('settings screen', () => {
  it('opens from the panel and returns to it', async () => {
    const r = await open();
    await press(r, 'panel-settings');
    expect(has(r, 'gap-dark-value')).toBe(true);
    expect(has(r, 'tab-basic')).toBe(false);
    await press(r, 'settings-back');
    expect(has(r, 'tab-basic')).toBe(true);
  });

  it('steps a tone 1 % denser and persists it, leaving the other tones', async () => {
    const r = await open();
    await press(r, 'panel-settings');
    await press(r, 'gap-dark-more');
    expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, coverage: { light: 4, dark: 12, black: 21 } });
    expect(r.root.findByProps({ testID: 'gap-dark-value' }).props.children).toBe('12 %');
    await press(r, 'gap-dark-less');
    await press(r, 'gap-dark-less');
    expect(r.root.findByProps({ testID: 'gap-dark-value' }).props.children).toBe('10 %');
  });

  it('disables stepping past 1 % and 66 %, and the padding ends', async () => {
    device.settings = { ...device.settings, coverage: { light: 1, dark: 11, black: 66 }, wrapPadding: 0 };
    const r = await open();
    await press(r, 'panel-settings');
    const disabled = (id: string) => r.root.findAllByProps({ testID: id })[0].props.disabled;
    expect(disabled('gap-light-less')).toBe(true);
    expect(disabled('gap-black-more')).toBe(true);
    expect(disabled('wrap-padding-less')).toBe(true);
    expect(disabled('gap-dark-less')).toBe(false);
  });

  it('steps wrap padding and resets everything to defaults', async () => {
    const r = await open();
    await press(r, 'panel-settings');
    await press(r, 'wrap-padding-more');
    expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, wrapPadding: 36 });
    expect(r.root.findByProps({ testID: 'wrap-padding-value' }).props.children).toBe('3 mm');
    await press(r, 'gap-light-less');
    await press(r, 'settings-reset');
    expect(mocked.saveSettings).toHaveBeenLastCalledWith({ ...device.settings, coverage: TONE_COVERAGE, wrapPadding: 24 });
  });
});

it('hatches at the saved gap and records it in the recipe', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle', style: { ...DEFAULT_STYLE, fill: 'hatch' }, coverage: { ...TONE_COVERAGE, dark: 6 } };
  const r = await open();
  await gesture(r, [300, 400], [300, 400]);
  expect((renderShape as jest.Mock).mock.calls[0][4]).toBe(hatchGap(6));
  const [, , recipe] = mocked.insertPlan.mock.calls[0] as any[];
  expect(recipe.gap).toBe(hatchGap(6));
});

it('records no gap for an unhatched shape', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await gesture(r, [300, 400], [300, 400]);
  const [, , recipe] = mocked.insertPlan.mock.calls[0] as any[];
  expect(recipe).not.toHaveProperty('gap');
});
