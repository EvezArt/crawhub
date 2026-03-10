import type { GenericDatabaseReader, GenericDatabaseWriter, GenericId } from 'convex/server'
import type { DataModel, Doc } from '../_generated/dataModel'
import { type PublicUser, toPublicUser } from './public'

type EntityType = 'skills' | 'souls'
type CommentTableType = 'comments' | 'soulComments'

type CommentConfig<TEntity extends EntityType, TComment extends CommentTableType> = {
  entityTable: TEntity
  commentTable: TComment
  entityIdField: TComment extends 'comments' ? 'skillId' : 'soulId'
  indexName: TComment extends 'comments' ? 'by_skill' : 'by_soul'
  auditAction: string
  auditTargetType: string
  entityNotFoundError: string
}

export async function listCommentsByEntity<
  TEntity extends EntityType,
  TComment extends CommentTableType,
>(
  db: GenericDatabaseReader<DataModel>,
  entityId: GenericId<TEntity>,
  config: CommentConfig<TEntity, TComment>,
  limit = 50,
): Promise<Array<{ comment: Doc<TComment>; user: PublicUser | null }>> {
  const comments = await db
    .query(config.commentTable)
    .withIndex(config.indexName as any, (q: any) => q.eq(config.entityIdField, entityId))
    .order('desc')
    .take(limit)

  const results: Array<{ comment: Doc<TComment>; user: PublicUser | null }> = []
  for (const comment of comments) {
    if (comment.softDeletedAt) continue
    const user = toPublicUser(await db.get(comment.userId))
    results.push({ comment, user })
  }
  return results
}

export async function addComment<TEntity extends EntityType, TComment extends CommentTableType>(
  db: GenericDatabaseWriter<DataModel>,
  userId: GenericId<'users'>,
  entityId: GenericId<TEntity>,
  body: string,
  config: CommentConfig<TEntity, TComment>,
): Promise<void> {
  const trimmedBody = body.trim()
  if (!trimmedBody) throw new Error('Comment body required')

  const entity = await db.get(entityId)
  if (!entity) throw new Error(config.entityNotFoundError)

  const commentData: any = {
    [config.entityIdField]: entityId,
    userId,
    body: trimmedBody,
    createdAt: Date.now(),
    softDeletedAt: undefined,
    deletedBy: undefined,
  }

  await db.insert(config.commentTable, commentData)

  await db.patch(entityId, {
    stats: { ...entity.stats, comments: entity.stats.comments + 1 },
    updatedAt: Date.now(),
  } as any)
}

export async function removeComment<TEntity extends EntityType, TComment extends CommentTableType>(
  db: GenericDatabaseWriter<DataModel>,
  commentId: GenericId<TComment>,
  userId: GenericId<'users'>,
  isCommentOwner: boolean,
  config: CommentConfig<TEntity, TComment>,
): Promise<void> {
  const comment = await db.get(commentId)
  if (!comment) throw new Error('Comment not found')
  if (comment.softDeletedAt) return

  await db.patch(commentId, {
    softDeletedAt: Date.now(),
    deletedBy: userId,
  } as any)

  const entityId = (comment as any)[config.entityIdField] as GenericId<TEntity>
  const entity = await db.get(entityId)
  if (entity) {
    await db.patch(entityId, {
      stats: { ...entity.stats, comments: Math.max(0, entity.stats.comments - 1) },
      updatedAt: Date.now(),
    } as any)
  }

  await db.insert('auditLogs', {
    actorUserId: userId,
    action: config.auditAction,
    targetType: config.auditTargetType,
    targetId: commentId as any,
    metadata: { [config.entityIdField]: entityId } as any,
    createdAt: Date.now(),
  })
}
