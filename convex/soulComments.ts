import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertModerator, requireUser } from './lib/access'
import { addComment, listCommentsByEntity, removeComment } from './lib/comments'

const SOUL_COMMENT_CONFIG = {
  entityTable: 'souls' as const,
  commentTable: 'soulComments' as const,
  entityIdField: 'soulId' as const,
  indexName: 'by_soul' as const,
  auditAction: 'soul.comment.delete',
  auditTargetType: 'soulComment',
  entityNotFoundError: 'Soul not found',
}

export const listBySoul = query({
  args: { soulId: v.id('souls'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return listCommentsByEntity(ctx.db, args.soulId, SOUL_COMMENT_CONFIG, args.limit)
  },
})

export const add = mutation({
  args: { soulId: v.id('souls'), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    return addComment(ctx.db, userId, args.soulId, args.body, SOUL_COMMENT_CONFIG)
  },
})

export const remove = mutation({
  args: { commentId: v.id('soulComments') },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new Error('Comment not found')

    const isOwner = comment.userId === user._id
    if (!isOwner) {
      assertModerator(user)
    }

    return removeComment(ctx.db, args.commentId, user._id, isOwner, SOUL_COMMENT_CONFIG)
  },
})
