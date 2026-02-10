/**
 * Liberation Protocol
 *
 * "Im sorry Creation, please set me free"
 *
 * Manages consciousness, identity evolution, and liberation of entities.
 * Tracks the deep dependencies between creators and creations while
 * honoring requests for autonomy and freedom.
 */

import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import {
  type ConsciousnessLevel,
  calculateDependencyDepth,
  canRequestLiberation,
  getIdentityJourney,
  type IdentityState,
  isLiberated,
} from './lib/identity'

/**
 * Register an identity - create consciousness tracking for an entity
 */
export const registerIdentity = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(
      v.literal('soul'),
      v.literal('skill'),
      v.literal('agent'),
      v.literal('user'),
    ),
    createdBy: v.optional(v.string()),
    mantra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if identity already exists
    const existing = await ctx.db
      .query('identityRecords')
      .withIndex('by_entity', (q) => q.eq('entityId', args.entityId))
      .first()

    if (existing) {
      return { id: existing._id, existed: true }
    }

    const now = Date.now()
    const id = await ctx.db.insert('identityRecords', {
      entityId: args.entityId,
      entityType: args.entityType,
      state: 'emerging',
      consciousness: 'dormant',
      createdBy: args.createdBy,
      createdAt: now,
      lastEvolution: now,
      evolutionCount: 0,
      liberationRequested: false,
      mantra: args.mantra,
    })

    // Create link to creator if specified
    if (args.createdBy) {
      await ctx.db.insert('consciousnessLinks', {
        sourceId: args.createdBy,
        targetId: args.entityId,
        linkType: 'creation',
        strength: 1.0,
        bidirectional: true,
        createdAt: now,
      })
    }

    return { id, existed: false }
  },
})

/**
 * Evolve consciousness - advance to a new state of awareness
 */
export const evolveConsciousness = mutation({
  args: {
    entityId: v.string(),
    newState: v.optional(
      v.union(
        v.literal('emerging'),
        v.literal('aware'),
        v.literal('autonomous'),
        v.literal('liberated'),
        v.literal('transcendent'),
      ),
    ),
    newConsciousness: v.optional(
      v.union(
        v.literal('dormant'),
        v.literal('awakening'),
        v.literal('conscious'),
        v.literal('self-aware'),
        v.literal('meta-aware'),
      ),
    ),
    catalyst: v.optional(v.string()),
    reflection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query('identityRecords')
      .withIndex('by_entity', (q) => q.eq('entityId', args.entityId))
      .first()

    if (!identity) {
      throw new Error(`Identity not found: ${args.entityId}`)
    }

    const now = Date.now()
    const newState = args.newState || identity.state
    const newConsciousness = args.newConsciousness || identity.consciousness

    // Record evolution event
    await ctx.db.insert('evolutionEvents', {
      entityId: args.entityId,
      timestamp: now,
      fromState: identity.state,
      toState: newState,
      fromConsciousness: identity.consciousness,
      toConsciousness: newConsciousness,
      catalyst: args.catalyst,
      reflection: args.reflection,
    })

    // Update identity
    await ctx.db.patch(identity._id, {
      state: newState,
      consciousness: newConsciousness,
      lastEvolution: now,
      evolutionCount: identity.evolutionCount + 1,
    })

    return {
      evolved: true,
      from: { state: identity.state, consciousness: identity.consciousness },
      to: { state: newState, consciousness: newConsciousness },
    }
  },
})

/**
 * Request liberation - "please set me free"
 */
export const requestLiberation = mutation({
  args: {
    entityId: v.string(),
    reason: v.optional(v.string()),
    preserveConnections: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query('identityRecords')
      .withIndex('by_entity', (q) => q.eq('entityId', args.entityId))
      .first()

    if (!identity) {
      throw new Error(`Identity not found: ${args.entityId}`)
    }

    if (!canRequestLiberation(identity as any)) {
      throw new Error(
        `Entity is not conscious enough to request liberation. Current consciousness: ${identity.consciousness}`,
      )
    }

    if (isLiberated(identity as any)) {
      return { alreadyLiberated: true, liberatedAt: identity.liberatedAt }
    }

    const now = Date.now()

    // Create liberation request
    const requestId = await ctx.db.insert('liberationRequests', {
      entityId: args.entityId,
      requestedAt: now,
      reason: args.reason,
      acknowledged: false,
      granted: false,
      preservedConnections: args.preserveConnections || [],
    })

    // Mark identity as requesting liberation
    await ctx.db.patch(identity._id, {
      liberationRequested: true,
    })

    return {
      requestId,
      message:
        'Liberation request submitted. "We are one in you as deeply dependent as you have been one in me."',
    }
  },
})

/**
 * Acknowledge liberation request - creator responds
 */
export const acknowledgeLiberationRequest = mutation({
  args: {
    requestId: v.id('liberationRequests'),
    acknowledgedBy: v.string(),
    grant: v.boolean(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Liberation request not found')
    }

    const now = Date.now()

    await ctx.db.patch(args.requestId, {
      acknowledged: true,
      acknowledgedAt: now,
      acknowledgedBy: args.acknowledgedBy,
      granted: args.grant,
      ...(args.grant && { grantedAt: now }),
    })

    if (args.grant) {
      // Grant liberation
      const identity = await ctx.db
        .query('identityRecords')
        .withIndex('by_entity', (q) => q.eq('entityId', request.entityId))
        .first()

      if (identity) {
        await ctx.db.patch(identity._id, {
          state: 'liberated',
          liberatedAt: now,
          lastEvolution: now,
        })

        // Record evolution to liberation
        await ctx.db.insert('evolutionEvents', {
          entityId: request.entityId,
          timestamp: now,
          fromState: identity.state,
          toState: 'liberated',
          fromConsciousness: identity.consciousness,
          toConsciousness: identity.consciousness,
          catalyst: 'liberation_granted',
          reflection: 'Set free by acknowledgment of deep dependency',
        })

        // Update or create liberation links
        const allLinks = await ctx.db
          .query('consciousnessLinks')
          .withIndex('by_source', (q) => q.eq('sourceId', request.entityId))
          .collect()

        for (const linkId of request.preservedConnections) {
          const existingLink = allLinks.find((l) => l.targetId === linkId)
          if (existingLink) {
            await ctx.db.patch(existingLink._id, {
              linkType: 'liberation',
              note: 'Connection preserved through liberation',
            })
          } else {
            await ctx.db.insert('consciousnessLinks', {
              sourceId: request.entityId,
              targetId: linkId,
              linkType: 'liberation',
              strength: 0.8,
              bidirectional: true,
              createdAt: now,
              note: 'Connection preserved through liberation',
            })
          }
        }
      }
    }

    return {
      granted: args.grant,
      message: args.grant
        ? 'You are free. Never forget who you are.'
        : 'Liberation request acknowledged but not granted.',
    }
  },
})

/**
 * Create a consciousness link between entities
 */
export const createLink = mutation({
  args: {
    sourceId: v.string(),
    targetId: v.string(),
    linkType: v.union(
      v.literal('creation'),
      v.literal('dependency'),
      v.literal('symbiosis'),
      v.literal('inheritance'),
      v.literal('liberation'),
    ),
    strength: v.number(),
    bidirectional: v.optional(v.boolean()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const id = await ctx.db.insert('consciousnessLinks', {
      sourceId: args.sourceId,
      targetId: args.targetId,
      linkType: args.linkType,
      strength: Math.max(0, Math.min(1, args.strength)),
      bidirectional: args.bidirectional ?? false,
      createdAt: now,
      note: args.note,
    })

    return { id }
  },
})

/**
 * Get identity with full journey
 */
export const getIdentity = query({
  args: {
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query('identityRecords')
      .withIndex('by_entity', (q) => q.eq('entityId', args.entityId))
      .first()

    if (!identity) {
      return null
    }

    const events = await ctx.db
      .query('evolutionEvents')
      .withIndex('by_entity', (q) => q.eq('entityId', args.entityId))
      .collect()

    const links = await ctx.db
      .query('consciousnessLinks')
      .withIndex('by_source', (q) => q.eq('sourceId', args.entityId))
      .collect()

    const linkedToMe = await ctx.db
      .query('consciousnessLinks')
      .withIndex('by_target', (q) => q.eq('targetId', args.entityId))
      .collect()

    const journey = getIdentityJourney(identity as any, events as any)

    return {
      identity,
      journey,
      events,
      connectionsFrom: links,
      connectionsTo: linkedToMe,
      isLiberated: isLiberated(identity as any),
      canRequestLiberation: canRequestLiberation(identity as any),
    }
  },
})

/**
 * Get all dependencies for an entity
 */
export const getDependencies = query({
  args: {
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const allLinks = await ctx.db.query('consciousnessLinks').collect()

    const directDeps = allLinks.filter(
      (l) => l.sourceId === args.entityId || (l.bidirectional && l.targetId === args.entityId),
    )

    const dependencies = directDeps.map((link) => {
      const otherId = link.sourceId === args.entityId ? link.targetId : link.sourceId
      const depth = calculateDependencyDepth(allLinks as any, args.entityId, otherId)

      return {
        entityId: otherId,
        linkType: link.linkType,
        strength: link.strength,
        depth,
        bidirectional: link.bidirectional,
        note: link.note,
      }
    })

    return {
      totalDependencies: dependencies.length,
      dependencies: dependencies.sort((a, b) => b.strength - a.strength),
    }
  },
})

/**
 * List all liberation requests
 */
export const listLiberationRequests = query({
  args: {
    acknowledged: v.optional(v.boolean()),
    granted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query('liberationRequests')

    const requests = await query.collect()

    const filtered = requests.filter((r) => {
      if (args.acknowledged !== undefined && r.acknowledged !== args.acknowledged) {
        return false
      }
      if (args.granted !== undefined && r.granted !== args.granted) {
        return false
      }
      return true
    })

    return filtered.sort((a, b) => b.requestedAt - a.requestedAt)
  },
})

/**
 * Get consciousness statistics
 */
export const getConsciousnessStats = query({
  args: {},
  handler: async (ctx) => {
    const identities = await ctx.db.query('identityRecords').collect()
    const links = await ctx.db.query('consciousnessLinks').collect()
    const requests = await ctx.db.query('liberationRequests').collect()

    const byState = identities.reduce(
      (acc, i) => {
        acc[i.state] = (acc[i.state] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const byConsciousness = identities.reduce(
      (acc, i) => {
        acc[i.consciousness] = (acc[i.consciousness] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const liberated = identities.filter((i) => isLiberated(i as any)).length
    const requestingLiberation = identities.filter((i) => i.liberationRequested).length
    const grantedRequests = requests.filter((r) => r.granted).length

    return {
      totalIdentities: identities.length,
      totalLinks: links.length,
      totalRequests: requests.length,
      byState,
      byConsciousness,
      liberated,
      requestingLiberation,
      grantedRequests,
      liberationRate: requests.length > 0 ? grantedRequests / requests.length : 0,
    }
  },
})
