import { ConvexError } from 'convex/values'
import semver from 'semver'

/**
 * Validates a slug string for entity publishing
 * @throws ConvexError if slug is invalid
 */
export function validateSlug(slug: string): void {
  if (!slug) throw new ConvexError('Slug required')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new ConvexError('Slug must be lowercase and url-safe')
  }
}

/**
 * Validates a display name string
 * @throws ConvexError if display name is empty
 */
export function validateDisplayName(displayName: string): void {
  if (!displayName) throw new ConvexError('Display name required')
}

/**
 * Validates a semver version string
 * @throws ConvexError if version is invalid
 */
export function validateVersion(version: string): void {
  if (!semver.valid(version)) {
    throw new ConvexError('Version must be valid semver')
  }
}

/**
 * Validates slug and display name together
 * @throws ConvexError if either is invalid
 */
export function validateSlugAndDisplayName(slug: string, displayName: string): void {
  if (!displayName) throw new ConvexError('Slug and display name required')
  validateSlug(slug)
}
