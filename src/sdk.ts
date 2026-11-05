import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';

type APIResponse<T> = {
  success: boolean;
  result: T | null;
  error: { code: number; message: string } | null;
};

/** Unwraps an APIResponse, throwing with the API name so failures are traceable on-device. */
export async function call<T>(label: string, promise: Promise<unknown>): Promise<T> {
  const res = (await promise) as APIResponse<T> | null | undefined;
  if (!res?.success) {
    const code = res?.error?.code != null ? ` (${res.error.code})` : '';
    throw new Error(`${label}: ${res?.error?.message ?? 'failed'}${code}`);
  }
  return res.result as T;
}

export async function ensurePermission(permission: string, desc: string): Promise<void> {
  if ((await PluginManager.hasPermission(permission)) === 1) {
    return;
  }
  const granted = await PluginManager.requestPermission(permission, desc);
  if (granted !== 1 && granted !== 2) {
    throw new Error(`Permission ${permission} was not granted`);
  }
}

/**
 * Elements arrive from native as plain objects, so the documented
 * `element.recycle()` method does not exist on them; use the static API.
 */
export function recycle(el: { uuid?: string } | null | undefined): void {
  try {
    if (el?.uuid) {
      PluginCommAPI.recycleElement(el.uuid);
    }
  } catch (e) {
    console.warn('recycleElement failed', e);
  }
}
