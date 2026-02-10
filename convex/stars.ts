import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { requireUser } from './lib/access'
import { toPublicSkill } from './lib/public'
import { insertStatEvent } from './skillStatEvents'

export const isStarred = query({
  args: { skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', userId))
      .unique()
    return Boolean(existing)
  },
})

export const toggle = mutation({
  args: { skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error('Skill not found')

    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', userId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
      await insertStatEvent(ctx, { skillId: skill._id, kind: 'unstar' })
      return { starred: false }
    }

    await ctx.db.insert('stars', {
      skillId: args.skillId,
      userId,
      createdAt: Date.now(),
    })

    await insertStatEvent(ctx, { skillId: skill._id, kind: 'star' })

    return { starred: true }
  },
})

export const listByUser = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const stars = await ctx.db
      .query('stars')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
    const skillsData = await Promise.all(
      stars.map(async (star) => {
        const skill = await ctx.db.get(star.skillId)
        return toPublicSkill(skill)
      }),
    )
    return skillsData.filter((skill): skill is NonNullable<typeof skill> => skill !== null)
  },
})

export const addStarInternal = internalMutation({
  args: { userId: v.id('users'), skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error('Skill not found')
    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', args.userId))
      .unique()
    if (existing) return { ok: true as const, starred: true, alreadyStarred: true }

    await ctx.db.insert('stars', {
      skillId: args.skillId,
      userId: args.userId,
      createdAt: Date.now(),
    })

    await insertStatEvent(ctx, { skillId: skill._id, kind: 'star' })

    return { ok: true as const, starred: true, alreadyStarred: false }
  },
})

export const removeStarInternal = internalMutation({
  args: { userId: v.id('users'), skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error('Skill not found')
    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', args.userId))
      .unique()
    if (!existing) return { ok: true as const, unstarred: false, alreadyUnstarred: true }

    await ctx.db.delete(existing._id)
    await insertStatEvent(ctx, { skillId: skill._id, kind: 'unstar' })

    return { ok: true as const, unstarred: true, alreadyUnstarred: false }
  },
})
