import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';
import type { Box } from './contracts';
import { call } from './sdk';

const PAD = 6;

/**
 * The plugin view must close first: lassoing before the close left nothing
 * selected. No timer between the two: JS timers do not fire while the view is
 * closed, so a sleep here only resumes on the next open.
 */
export async function selectRect(rect: Box): Promise<void> {
  await PluginManager.closePluginView();
  await call(
    'lassoElements',
    PluginCommAPI.lassoElements({ left: rect.left - PAD, top: rect.top - PAD, right: rect.right + PAD, bottom: rect.bottom + PAD }),
  );
}
