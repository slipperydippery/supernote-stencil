import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';
import type { Box } from '../shapes';
import { call, recycle } from './sdk';

const PAD = 6;

/** setLassoBoxState: 2 = remove the lasso box, leaving nothing selected. */
const LASSO_REMOVE = 2;

/**
 * The plugin view must close first: lassoing before the close left nothing
 * selected. No timer between the two: JS timers do not fire while the view is
 * closed, so a sleep here only resumes on the next open. The SDK rejects a
 * rect with fractional coordinates, so it is rounded outwards.
 *
 * The firmware can only select by rect (README finding "select only the
 * insert"). With `only`, the number of elements just inserted, a selection
 * that also caught existing ink is dropped rather than left to drag it along.
 */
export async function selectRect(rect: Box, only?: number): Promise<void> {
  await PluginManager.closePluginView();
  await call(
    'lassoElements',
    PluginCommAPI.lassoElements({
      left: Math.floor(rect.left - PAD),
      top: Math.floor(rect.top - PAD),
      right: Math.ceil(rect.right + PAD),
      bottom: Math.ceil(rect.bottom + PAD),
    }),
  );
  if (only === undefined) {
    return;
  }
  // lassoElements does not refresh the element cache, which would still hold the previous selection.
  PluginCommAPI.clearElementCache();
  const selected = (await call<unknown[] | null>('getLassoElements', PluginCommAPI.getLassoElements())) ?? [];
  selected.forEach(e => recycle(e as { uuid?: string }));
  if (selected.length > only) {
    await dropLasso();
  }
}

/** Removes the lasso box, leaving nothing selected. */
export async function dropLasso(): Promise<void> {
  await call('setLassoBoxState', PluginCommAPI.setLassoBoxState(LASSO_REMOVE));
}

/** Reopens the plugin view after a call sequence that had to close it. */
export async function showView(): Promise<void> {
  await PluginManager.showPluginView();
}

export async function closeView(): Promise<void> {
  await PluginManager.closePluginView();
}
