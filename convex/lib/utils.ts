import type { Id } from '../_generated/dataModel'

/**
 * Shared utility functions used across the codebase
 */

/**
 * Clamps a number to an integer within the specified range
 */
export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

/**
 * Fetches text content from a storage blob
 * @throws Error if file is missing in storage
 */
export async function fetchText(
  ctx: { storage: { get: (id: Id<'_storage'>) => Promise<Blob | null> } },
  storageId: Id<'_storage'>,
): Promise<string> {
  const blob = await ctx.storage.get(storageId)
  if (!blob) throw new Error('File missing in storage')
  return blob.text()
}

