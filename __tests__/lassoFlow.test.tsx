import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { device, deviceMock } from '../test/device-mock';

jest.mock('../src/device', () => require('../test/device-mock').deviceMock());

import * as dev from '../src/device';
import { DEFAULT_STYLE } from '../src/render/style';
import LassoFlow from '../src/ui/LassoFlow';

const mocked = dev as unknown as ReturnType<typeof deviceMock>;

const RECT = { left: 100, top: 100, right: 300, bottom: 200 };
const RECIPE = { v: 1 as const, shape: 'rectangle' as const, style: DEFAULT_STYLE, seed: 7 };

async function open(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<LassoFlow />);
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
  device.settings = { style: DEFAULT_STYLE, lastShape: null, tab: 'basic' };
  mocked.readLasso.mockResolvedValue({ rect: RECT, liveRect: RECT, recipe: null, count: 3, recipes: 0 });
});

it('reads the lasso once on mount and routes a bare selection to wrap', async () => {
  const r = await open();
  expect(mocked.readLasso).toHaveBeenCalledTimes(1);
  expect(has(r, 'panel-close')).toBe(true);
  expect(JSON.stringify(r.toJSON())).toContain('Wrap selection');
});

it('routes to redraw instead of wrap when the selection carries a recipe', async () => {
  mocked.readLasso.mockResolvedValue({ rect: RECT, liveRect: RECT, recipe: RECIPE, count: 1, recipes: 1 });
  const r = await open();
  expect(has(r, 'strip-icon-rectangle')).toBe(true);
  expect(has(r, 'strip-action')).toBe(true);
  expect(has(r, 'panel-close')).toBe(false);
});

it('shows two tabs in wrap mode, arrows excluded', async () => {
  const r = await open();
  expect(has(r, 'tab-basic')).toBe(true);
  expect(has(r, 'tab-flow')).toBe(true);
  expect(has(r, 'tab-arrow')).toBe(false);
});

it('inserts around the lasso rect and selects shape and content together on pick', async () => {
  const r = await open();
  await press(r, 'cell-rounded');
  const [, plan, recipe] = mocked.insertPlan.mock.calls[0] as any[];
  expect(plan.bounds).toEqual({ left: 76, top: 76, right: 324, bottom: 224 });
  expect(recipe).toMatchObject({ v: 1, shape: 'rounded', style: DEFAULT_STYLE });
  expect(mocked.selectRect).toHaveBeenCalledWith({ left: 76, top: 76, right: 324, bottom: 224 });
  expect(mocked.saveSettings).toHaveBeenLastCalledWith({ style: DEFAULT_STYLE, lastShape: 'rounded', tab: 'basic' });
});

it('closes the view from the wrap panel', async () => {
  const r = await open();
  await press(r, 'panel-close');
  expect(mocked.closeView).toHaveBeenCalled();
});

it('shows a notice instead of wrap when the lasso caught nothing', async () => {
  mocked.readLasso.mockResolvedValue({ rect: RECT, liveRect: RECT, recipe: null, count: 0, recipes: 0 });
  const r = await open();
  expect(JSON.stringify(r.toJSON())).toContain('nothing selected');
  expect(has(r, 'panel-close')).toBe(false);
  await press(r, 'message-close');
  expect(mocked.closeView).toHaveBeenCalled();
});
