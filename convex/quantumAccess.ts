import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { requireUser } from './lib/access'
import { createAccessProof, validateInlineAccess } from './lib/quantumAccess'

export const proveInlineAccess = mutation({
  args: {
    tokenId: v.id('apiTokens'),
    capability: v.union(
      v.literal('inline-access'),
      v.literal('hardware-proof'),
      v.literal('conventional-bypass'),
    ),
    method: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    // Validate the token has the required capability
    const validation = await validateInlineAccess(ctx, args.tokenId, args.capability)

    // Create a proof record
    const proofId = await createAccessProof(ctx, {
      userId,
      tokenId: args.tokenId,
      proofType:
        args.capability === 'inline-access'
          ? 'inline'
          : args.capability === 'hardware-proof'
            ? 'hardware'
            : 'conventional',
      capability: args.capability,
      method: args.method,
      metadata: args.metadata,
    })

    return {
      proofId,
      verified: validation.verified,
      capabilities: validation.capabilities,
      timestamp: Date.now(),
    }
  },
})

export const proveInlineAccessInternal = internalMutation({
  args: {
    userId: v.id('users'),
    tokenId: v.id('apiTokens'),
    capability: v.string(),
    method: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const capability = args.capability as 'inline-access' | 'hardware-proof' | 'conventional-bypass'

    // Validate the token has the required capability
    const validation = await validateInlineAccess(ctx, args.tokenId, capability)

    // Create a proof record
    const proofId = await createAccessProof(ctx, {
      userId: args.userId,
      tokenId: args.tokenId,
      proofType:
        capability === 'inline-access'
          ? 'inline'
          : capability === 'hardware-proof'
            ? 'hardware'
            : 'conventional',
      capability,
      method: args.method,
      metadata: args.metadata,
    })

    return {
      proofId,
      verified: validation.verified,
      capabilities: validation.capabilities,
      timestamp: Date.now(),
    }
  },
})

export const getMyProofs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const limit = args.limit ?? 50

    const proofs = await ctx.db
      .query('quantumAccessProofs')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)

    return proofs.map((proof) => ({
      _id: proof._id,
      tokenId: proof.tokenId,
      proofType: proof.proofType,
      capability: proof.capability,
      method: proof.proofData.method,
      timestamp: proof.proofData.timestamp,
      verified: proof.verified,
      createdAt: proof.createdAt,
    }))
  },
})

export const validateProof = query({
  args: {
    proofId: v.id('quantumAccessProofs'),
  },
  handler: async (ctx, args) => {
    const proof = await ctx.db.get(args.proofId)
    if (!proof) throw new Error('Proof not found')

    const token = await ctx.db.get(proof.tokenId)
    if (!token) throw new Error('Token not found')

    return {
      proofId: proof._id,
      proofType: proof.proofType,
      capability: proof.capability,
      method: proof.proofData.method,
      timestamp: proof.proofData.timestamp,
      verified: proof.verified && !token.revokedAt,
      tokenType: token.tokenType,
      tokenLabel: token.label,
    }
  },
})

export const validateProofInternal = internalQuery({
  args: {
    proofId: v.string(),
  },
  handler: async (ctx, args) => {
    const proof = await ctx.db.get(args.proofId as Id<'quantumAccessProofs'>)
    if (!proof) throw new Error('Proof not found')

    const token = await ctx.db.get(proof.tokenId)
    if (!token) throw new Error('Token not found')

    return {
      proofId: proof._id,
      proofType: proof.proofType,
      capability: proof.capability,
      method: proof.proofData.method,
      timestamp: proof.proofData.timestamp,
      verified: proof.verified && !token.revokedAt,
      tokenType: token.tokenType,
      tokenLabel: token.label,
    }
  },
})

export const getProofsByToken = query({
  args: {
    tokenId: v.id('apiTokens'),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const token = await ctx.db.get(args.tokenId)
    if (!token) throw new Error('Token not found')
    if (token.userId !== userId) throw new Error('Forbidden')

    const proofs = await ctx.db
      .query('quantumAccessProofs')
      .withIndex('by_token', (q) => q.eq('tokenId', args.tokenId))
      .order('desc')
      .take(100)

    return proofs.map((proof) => ({
      _id: proof._id,
      proofType: proof.proofType,
      capability: proof.capability,
      method: proof.proofData.method,
      verified: proof.verified,
      createdAt: proof.createdAt,
    }))
  },
})
