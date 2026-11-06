import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';
import type { Box } from '../shapes';
import { call } from './sdk';

const PAD = 6;

/**
 * The plugin view must close first: lassoing before the close left nothing
 * selected. No timer between the two: JS timers do not fire while the view is
 * closed, so a sleep here only resumes on the next open. The SDK rejects a
 * rect with fractional coordinates, so it is rounded outwards.
 */
export async function selectRect(rect: Box): Promise<void> {
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
}

export async function closeView(): Promise<void> {
  await PluginManager.closePluginView();
}
