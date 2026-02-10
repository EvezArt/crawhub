import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'

type BadgeKind = Doc<'skillBadges'>['kind']

export type SkillBadgeMap = Partial<Record<BadgeKind, { byUserId: Id<'users'>; at: number }>>

export type SkillBadgeSource = { badges?: SkillBadgeMap | null }

type BadgeCtx = Pick<QueryCtx, 'db'>

export function isSkillHighlighted(skill: SkillBadgeSource) {
  return Boolean(skill.badges?.highlighted)
}

export function isSkillOfficial(skill: SkillBadgeSource) {
  return Boolean(skill.badges?.official)
}

export function isSkillDeprecated(skill: SkillBadgeSource) {
  return Boolean(skill.badges?.deprecated)
}

export function buildBadgeMap(records: Doc<'skillBadges'>[]): SkillBadgeMap {
  return records.reduce<SkillBadgeMap>((acc, record) => {
    acc[record.kind] = { byUserId: record.byUserId, at: record.at }
    return acc
  }, {})
}

export async function getSkillBadgeMap(
  ctx: BadgeCtx,
  skillId: Id<'skills'>,
): Promise<SkillBadgeMap> {
  const records = await ctx.db
    .query('skillBadges')
    .withIndex('by_skill', (q) => q.eq('skillId', skillId))
    .collect()
  return buildBadgeMap(records)
}

export async function getSkillBadgeMaps(
  ctx: BadgeCtx,
  skillIds: Array<Id<'skills'>>,
): Promise<Map<Id<'skills'>, SkillBadgeMap>> {
  // Fetch all badges for all skills in a single query
  const allBadges = await ctx.db
    .query('skillBadges')
    .filter((q) => q.or(...skillIds.map((skillId) => q.eq(q.field('skillId'), skillId))))
    .collect()

  // Group badges by skillId
  const badgesBySkillId = new Map<Id<'skills'>, Doc<'skillBadges'>[]>()
  for (const badge of allBadges) {
    const existing = badgesBySkillId.get(badge.skillId) ?? []
    existing.push(badge)
    badgesBySkillId.set(badge.skillId, existing)
  }

  // Build badge maps for each skill
  const result = new Map<Id<'skills'>, SkillBadgeMap>()
  for (const skillId of skillIds) {
    const badges = badgesBySkillId.get(skillId) ?? []
    result.set(skillId, buildBadgeMap(badges))
  }
  return result
}
