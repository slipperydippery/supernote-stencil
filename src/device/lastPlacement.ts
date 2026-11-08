import type { Box } from '../shapes';
import type { PageCtx } from './page';
import { readKey, writeKey } from './settings';

/**
 * What the panel needs to take the last placed shape back: where it is and how to recognise
 * it. The shape's elements are the ones whose recipe carries `seed`; `count` is how many there
 * were. `note` is a hash of the note path, not the path, so the record fits a directory name.
 */
export type LastPlacement = { note: string; page: number; seed: number; count: number; box: Box };

const KEY = 'lastPlacement';

/** FNV-1a over the path, base 36: equality is all the record needs. */
export function noteKey(notePath: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < notePath.length; i++) {
    h ^= notePath.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function encode(r: LastPlacement): string {
  const { left, top, right, bottom } = r.box;
  return [r.page, r.seed, r.count, Math.floor(left), Math.floor(top), Math.ceil(right), Math.ceil(bottom), r.note].join('-');
}

function decode(raw: string): LastPlacement | null {
  const parts = raw.split('-');
  if (parts.length !== 8) {
    return null;
  }
  const nums = parts.slice(0, 7).map(Number);
  if (!nums.every(Number.isInteger)) {
    return null;
  }
  const [page, seed, count, left, top, right, bottom] = nums;
  if (count <= 0 || right < left || bottom < top) {
    return null;
  }
  return { note: parts[7], page, seed, count, box: { left, top, right, bottom } };
}

export function recordPlacement(ctx: PageCtx, seed: number, count: number, box: Box): Promise<void> {
  return writeKey(KEY, encode({ note: noteKey(ctx.notePath), page: ctx.page, seed, count, box }));
}

/** The last placement, if it was on this note and page. */
export async function loadLastPlacement(ctx: PageCtx): Promise<LastPlacement | null> {
  const raw = await readKey(KEY);
  const r = raw === null ? null : decode(raw);
  return r && r.page === ctx.page && r.note === noteKey(ctx.notePath) ? r : null;
}

export function clearLastPlacement(): Promise<void> {
  return writeKey(KEY, null);
}

/** Forgets the record when it describes the shape with this seed: the shape is gone or redrawn. */
export async function forgetPlacement(seed: number): Promise<void> {
  const raw = await readKey(KEY);
  const r = raw === null ? null : decode(raw);
  if (r && r.seed === seed) {
    await clearLastPlacement();
  }
}
