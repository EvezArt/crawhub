/**
 * Shared utility functions used across the codebase
 */

/**
 * Clamps a number to an integer within the specified range
 */
export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)))
}
