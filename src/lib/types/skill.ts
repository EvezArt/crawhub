/**
 * Typed skill models for AI-usable APIs
 * These types build on top of the existing Convex schema but add
 * AI-specific metadata like capabilities, input/output schemas.
 */

import type { Doc } from '../../../convex/_generated/dataModel'

/**
 * Skill statistics
 */
export type SkillStats = {
  downloads: number
  stars: number
  installsAllTime: number
  versions: number
  comments?: number
  installsCurrent?: number
}

/**
 * Skill capability - describes what an AI agent can do with this skill
 */
export type SkillCapability = {
  /** Unique capability identifier */
  id: string
  /** Action verbs this skill supports (e.g., ["scan", "plan", "propose"]) */
  verbs: string[]
  /** Resources this skill operates on (e.g., ["github", "agents", "skills"]) */
  resources: string[]
}

/**
 * Skill metadata with AI-specific extensions
 */
export type SkillMeta = {
  /** Skill identifier (slug) */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Category (optional) */
  category?: string
  /** Tags */
  tags?: string[]
  /** Capability metadata for AI planners */
  capability?: SkillCapability
  /** JSON Schema for input (optional) */
  inputSchema?: Record<string, unknown>
  /** JSON Schema for output (optional) */
  outputSchema?: Record<string, unknown>
}

/**
 * Complete skill record for AI consumption
 * Combines database fields with AI-specific metadata
 */
export type SkillRecord = {
  /** Database ID */
  _id: string
  /** Creation timestamp */
  _creationTime: number
  /** Skill metadata */
  meta: SkillMeta
  /** Statistics */
  stats: SkillStats
  /** Owner user ID */
  ownerUserId: string
  /** Owner handle */
  ownerHandle?: string
  /** Latest version ID */
  latestVersionId?: string
  /** Latest version string */
  latestVersion?: string
  /** Created timestamp */
  createdAt: number
  /** Last updated timestamp */
  updatedAt: number
  /** Badges (optional) */
  badges?: Doc<'skills'>['badges']
}

/**
 * Convert a Convex skill document to a SkillRecord
 */
export function toSkillRecord(
  skill: Doc<'skills'>,
  ownerHandle?: string,
  latestVersion?: string,
): SkillRecord {
  const stats: SkillStats = {
    downloads: skill.stats.downloads,
    stars: skill.stats.stars,
    installsAllTime: skill.stats.installsAllTime ?? 0,
    versions: skill.stats.versions,
    comments: skill.stats.comments,
    installsCurrent: skill.stats.installsCurrent,
  }

  const meta: SkillMeta = {
    id: skill.slug,
    name: skill.displayName,
    description: skill.summary ?? '',
    tags: Object.keys(skill.tags ?? {}),
  }

  return {
    _id: skill._id,
    _creationTime: skill._creationTime,
    meta,
    stats,
    ownerUserId: skill.ownerUserId,
    ownerHandle,
    latestVersionId: skill.latestVersionId,
    latestVersion,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
    badges: skill.badges,
  }
}
