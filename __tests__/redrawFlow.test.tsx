import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { device, deviceMock } from '../test/device-mock';

jest.mock('../src/device', () => require('../test/device-mock').deviceMock());
jest.mock('../src/render/plan', () => {
  const real = jest.requireActual('../src/render/plan');
  return { ...real, renderShape: jest.fn(real.renderShape) };
});

import * as dev from '../src/device';
import { renderShape } from '../src/render/plan';
import type { LassoSelection } from '../src/device';
import type { Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE, hatchGap, TONE_GAP } from '../src/render/style';
import RedrawFlow from '../src/ui/RedrawFlow';

const mocked = dev as unknown as ReturnType<typeof deviceMock>;

const LIVE_RECT = { left: 100, top: 100, right: 500, bottom: 300 };
const RECIPE: Recipe = { v: 1, shape: 'rectangle', style: DEFAULT_STYLE, seed: 42 };

type Selection = LassoSelection & { recipe: Recipe };

function selection(overrides: Partial<Selection> = {}): Selection {
  return { rect: LIVE_RECT, liveRect: LIVE_RECT, recipe: RECIPE, count: 1, recipes: 1, shapes: 1, own: null, ...overrides };
}

async function open(sel: Selection = selection()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<RedrawFlow selection={sel} />);
  });
  return r;
}

const has = (r: ReactTestRenderer, testID: string) => r.root.findAllByProps({ testID }).length > 0;
const press = async (r: ReactTestRenderer, testID: string) => {
  await act(async () => {
    r.root.findAllByProps({ testID })[0].props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  device.log = [];
  device.settings = { ...device.settings, coverage: { light: 2, dark: 8, black: 30 } };
});

it('shows the strip armed with the recipe shape and style, with an apply mark', async () => {
  const r = await open();
  expect(has(r, 'strip-icon-rectangle')).toBe(true);
  expect(has(r, 'strip-action')).toBe(true);
});

it('refuses a mixed selection whose own elements could not be read, before any destructive call', async () => {
  const r = await open(selection({ count: 5, recipes: 4 }));
  expect(JSON.stringify(r.toJSON())).toContain('Select only the Stencil shape to redraw');
  expect(has(r, 'strip-action')).toBe(false);
  expect(mocked.replaceLasso).not.toHaveBeenCalled();
});

const OWN = { nums: [3, 4], box: { left: 120, top: 130, right: 220, bottom: 230 } };

it('warns about two shapes and touches nothing', async () => {
  const r = await open(selection({ count: 4, recipes: 2, shapes: 2 }));
  expect(JSON.stringify(r.toJSON())).toContain('2 Stencil shapes selected: select one to redraw');
  expect(has(r, 'strip-action')).toBe(false);
  expect(mocked.replaceLasso).not.toHaveBeenCalled();
  expect(mocked.replaceElements).not.toHaveBeenCalled();
});

it("redraws only the shape's own elements into their bounds when other ink was selected too", async () => {
  const r = await open(selection({ count: 5, recipes: 2, own: OWN }));
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][1]).toEqual(OWN.box);
  const [, nums, plan] = mocked.replaceElements.mock.calls[0] as any[];
  expect(nums).toEqual([3, 4]);
  expect(mocked.replaceLasso).not.toHaveBeenCalled();
  expect(mocked.selectRect).toHaveBeenCalledWith(plan.bounds, plan.strokes.length + plan.geometries.length);
});

it('refuses a mixed selection with a pending move or stretch', async () => {
  const r = await open(selection({ count: 5, recipes: 2, own: OWN, liveRect: { ...LIVE_RECT, right: 600 } }));
  expect(JSON.stringify(r.toJSON())).toContain('on its own');
  expect(has(r, 'strip-action')).toBe(false);
});

it('takes a preview box within 2 px of the lasso rect as no transform', async () => {
  const r = await open(selection({ count: 5, recipes: 2, own: OWN, liveRect: { ...LIVE_RECT, right: 502 } }));
  expect(has(r, 'strip-action')).toBe(true);
});

it('regenerates with the same seed into the deflated lasso box, then selects the result', async () => {
  const r = await open();
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][1]).toEqual({ left: 107, top: 107, right: 493, bottom: 293 });
  expect((renderShape as jest.Mock).mock.calls[0][3]).toBe(RECIPE.seed);
  const [, plan, recipe] = mocked.replaceLasso.mock.calls[0] as any[];
  expect(recipe).toEqual({ ...RECIPE, style: DEFAULT_STYLE });
  expect(mocked.selectRect).toHaveBeenCalledWith(plan.bounds, plan.strokes.length + plan.geometries.length);
  expect(device.log[device.log.length - 1]).toBe('selectRect');
});

it('passes a style change made before apply into the recipe and plan', async () => {
  const r = await open();
  await press(r, 'chip-fill-hatch');
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][2].fill).toBe('hatch');
  const [, , recipe] = mocked.replaceLasso.mock.calls[0] as any[];
  expect(recipe.style.fill).toBe('hatch');
});

it('closes the view from the strip without replacing anything', async () => {
  const r = await open();
  await press(r, 'strip-close');
  expect(mocked.closeView).toHaveBeenCalled();
  expect(mocked.replaceLasso).not.toHaveBeenCalled();
});

it("keeps the shape's recorded gap when the tone is unchanged", async () => {
  const r = await open(selection({ recipe: { ...RECIPE, style: { ...DEFAULT_STYLE, fill: 'hatch' }, gap: 18 } }));
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][4]).toBe(18);
  expect((mocked.replaceLasso.mock.calls[0] as any[])[2].gap).toBe(18);
});

it('takes the saved gap for a new tone', async () => {
  const r = await open(selection({ recipe: { ...RECIPE, style: { ...DEFAULT_STYLE, fill: 'hatch' }, gap: 18 } }));
  await press(r, 'chip-tone-black');
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][4]).toBe(hatchGap(30));
  expect((mocked.replaceLasso.mock.calls[0] as any[])[2].gap).toBe(hatchGap(30));
});

it('drops the gap when the fill no longer hatches', async () => {
  const r = await open(selection({ recipe: { ...RECIPE, style: { ...DEFAULT_STYLE, fill: 'hatch' }, gap: 18 } }));
  await press(r, 'chip-fill-solid');
  await press(r, 'strip-action');
  expect((mocked.replaceLasso.mock.calls[0] as any[])[2]).not.toHaveProperty('gap');
});

it('gives a hatched shape from before the setting its built-in gap', async () => {
  const r = await open(selection({ recipe: { ...RECIPE, style: { ...DEFAULT_STYLE, fill: 'hatch' } } }));
  await press(r, 'strip-action');
  expect((renderShape as jest.Mock).mock.calls[0][4]).toBe(TONE_GAP.dark);
});
