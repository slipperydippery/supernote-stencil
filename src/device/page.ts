import { PluginCommAPI, PluginFileAPI } from 'sn-plugin-lib';
import { call, ensurePermission } from './sdk';

export type PageCtx = { notePath: string; page: number; width: number; height: number; unit: number };  // unit = width / 1920

export async function currentPage(): Promise<PageCtx> {
  // Without READ, getPageSize fails silently on some firmware.
  await ensurePermission('plugin.permission.FILE:READ', 'Stencil reads the open note');
  await ensurePermission('plugin.permission.FILE:WRITE', 'Stencil inserts shapes into the open note');
  const notePath = await call<string>('getCurrentFilePath', PluginCommAPI.getCurrentFilePath());
  const page = await call<number>('getCurrentPageNum', PluginCommAPI.getCurrentPageNum());
  const size = await call<{ width: number; height: number }>('getPageSize', PluginFileAPI.getPageSize(notePath, page));
  return { notePath, page, width: size.width, height: size.height, unit: size.width / 1920 };
}
