import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertModerator, requireUser } from './lib/access'
import { addComment, listCommentsByEntity, removeComment } from './lib/comments'

const SKILL_COMMENT_CONFIG = {
  entityTable: 'skills' as const,
  commentTable: 'comments' as const,
  entityIdField: 'skillId' as const,
  indexName: 'by_skill' as const,
  auditAction: 'comment.delete',
  auditTargetType: 'comment',
  entityNotFoundError: 'Skill not found',
}

export const listBySkill = query({
  args: { skillId: v.id('skills'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return listCommentsByEntity(ctx.db, args.skillId, SKILL_COMMENT_CONFIG, args.limit)
  },
})

export const add = mutation({
  args: { skillId: v.id('skills'), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    return addComment(ctx.db, userId, args.skillId, args.body, SKILL_COMMENT_CONFIG)
  },
})

export const remove = mutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new Error('Comment not found')

    const isOwner = comment.userId === user._id
    if (!isOwner) {
      assertModerator(user)
    }

    return removeComment(ctx.db, args.commentId, user._id, isOwner, SKILL_COMMENT_CONFIG)
  },
})
