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
import type { Recipe } from '../src/render/recipe';
import { DEFAULT_STYLE } from '../src/render/style';
import RedrawFlow from '../src/ui/RedrawFlow';

const mocked = dev as unknown as ReturnType<typeof deviceMock>;

const LIVE_RECT = { left: 100, top: 100, right: 500, bottom: 300 };
const RECIPE: Recipe = { v: 1, shape: 'rectangle', style: DEFAULT_STYLE, seed: 42 };

type Selection = { rect: typeof LIVE_RECT; liveRect: typeof LIVE_RECT; recipe: Recipe; count: number; recipes: number };

function selection(overrides: Partial<Selection> = {}): Selection {
  return { rect: LIVE_RECT, liveRect: LIVE_RECT, recipe: RECIPE, count: 1, recipes: 1, ...overrides };
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
});

it('shows the strip armed with the recipe shape and style, with an apply mark', async () => {
  const r = await open();
  expect(has(r, 'strip-icon-rectangle')).toBe(true);
  expect(has(r, 'strip-action')).toBe(true);
});

it('refuses a mixed selection before any destructive call', async () => {
  const r = await open(selection({ count: 5, recipes: 4 }));
  expect(JSON.stringify(r.toJSON())).toContain('Select only the Stencil shape to redraw');
  expect(has(r, 'strip-action')).toBe(false);
  expect(mocked.replaceLasso).not.toHaveBeenCalled();
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
