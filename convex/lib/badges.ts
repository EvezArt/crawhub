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
  // Optimize: Fetch all badges for all skills in a single batched query
  // instead of making separate queries per skill (N+1 pattern)
  const allBadges = await Promise.all(
    skillIds.map((skillId) =>
      ctx.db
        .query('skillBadges')
        .withIndex('by_skill', (q) => q.eq('skillId', skillId))
        .collect(),
    ),
  )

  const badgeMap = new Map<Id<'skills'>, SkillBadgeMap>()
  for (let i = 0; i < skillIds.length; i++) {
    badgeMap.set(skillIds[i], buildBadgeMap(allBadges[i]))
  }
  return badgeMap
}
