import React from 'react';
import { PixelRatio, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { device, deviceMock } from '../test/device-mock';

jest.mock('../src/device', () => require('../test/device-mock').deviceMock());
jest.mock('../src/render/plan', () => {
  const real = jest.requireActual('../src/render/plan');
  return { ...real, renderShape: jest.fn(real.renderShape) };
});

import * as dev from '../src/device';
import { renderShape } from '../src/render/plan';
import { DEFAULT_STYLE } from '../src/render/style';
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
  device.settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic' };
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

it('persists a tab tap and shows that family', async () => {
  const r = await open();
  await press(r, 'tab-flow');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ style: DEFAULT_STYLE, lastShape: null, tab: 'flow' });
  expect(has(r, 'cell-decision')).toBe(true);
  expect(has(r, 'cell-rectangle')).toBe(false);
});

it('arms the strip on pick and persists the shape', async () => {
  const r = await open();
  await press(r, 'tab-flow');
  await press(r, 'cell-decision');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ style: DEFAULT_STYLE, lastShape: 'decision', tab: 'flow' });
  expect(has(r, 'tab-flow')).toBe(false);
  expect(has(r, 'strip-icon-decision')).toBe(true);
});

it('persists a style chip in the strip and shows it selected', async () => {
  device.settings = { ...device.settings, lastShape: 'rectangle' };
  const r = await open();
  await press(r, 'chip-line-dashed');
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ style: { ...DEFAULT_STYLE, line: 'dashed' }, lastShape: 'rectangle', tab: 'basic' });
  expect(r.root.findAllByProps({ testID: 'chip-line-dashed' })[0].props.accessibilityState).toEqual({ selected: true });
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
  // Segment centres in dp.
  return band.findAll(n => n.type === View && n.props.style && !n.props.testID).map(n => {
    const st = Object.assign({}, ...[n.props.style].flat(Infinity));
    return { x: st.left + (st.width - 2) / 2, y: st.top + 1 };
  });
}

it('previews the armed shape in the box it will be rendered into while dragging', async () => {
  // Square: a dp drag (100, 100)–(400, 250) fits to page (350, 200)–(650, 500), dp (175, 100)–(325, 250).
  const square = await dragPreview('square', [100, 100], [400, 250]);
  expect(square).toHaveLength(4);
  for (const c of square) {
    const onEdge = [175, 325].some(x => Math.abs(c.x - x) < 1e-6) || [100, 250].some(y => Math.abs(c.y - y) < 1e-6);
    expect(onEdge).toBe(true);
  }
  // Diamond: no segment centre lies on the swept box's edges.
  const diamond = await dragPreview('diamond', [100, 100], [400, 250]);
  expect(diamond).toHaveLength(4);
  expect(diamond.every(c => c.x > 100 && c.x < 400 && c.y > 100 && c.y < 250)).toBe(true);
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
  expect(device.log).toEqual(['saveSettings', 'insertPlan', 'selectRect']);
});
