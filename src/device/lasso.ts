import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';
import type { Box } from './contracts';
import { call, sleep } from './sdk';

const PAD = 6;

/** The plugin view must close first: lassoing before the close left nothing selected. */
export async function selectRect(rect: Box): Promise<void> {
  await PluginManager.closePluginView();
  await sleep(300);
  await call(
    'lassoElements',
    PluginCommAPI.lassoElements({ left: rect.left - PAD, top: rect.top - PAD, right: rect.right + PAD, bottom: rect.bottom + PAD }),
  );
}
