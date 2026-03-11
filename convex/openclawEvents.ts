/**
 * OpenClaw Events - Store and retrieve agent events for the live dashboard
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Insert a new OpenClaw event
 */
export const insert = mutation({
  args: {
    sessionKey: v.string(),
    eventType: v.string(),
    timestamp: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('openclawEvents', {
      sessionKey: args.sessionKey,
      eventType: args.eventType,
      timestamp: args.timestamp,
      payload: args.payload,
      createdAt: Date.now(),
    })
    return eventId
  },
})

/**
 * Get events for a specific session, ordered by timestamp
 */
export const listBySession = query({
  args: {
    sessionKey: v.string(),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    let queryBuilder = ctx.db
      .query('openclawEvents')
      .withIndex('by_session', (q) => q.eq('sessionKey', args.sessionKey))

    if (args.sinceTimestamp !== undefined) {
      queryBuilder = queryBuilder.filter((q) => q.gte(q.field('timestamp'), args.sinceTimestamp))
    }

    const events = await queryBuilder.order('desc').take(limit)

    // Return in chronological order (oldest first)
    return events.reverse()
  },
})

/**
 * Get the most recent event for a session
 */
export const getLatest = query({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('openclawEvents')
      .withIndex('by_session', (q) => q.eq('sessionKey', args.sessionKey))
      .order('desc')
      .first()

    return event
  },
})

/**
 * Get session info (event count and latest timestamp)
 */
export const getSessionInfo = query({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query('openclawEvents')
      .withIndex('by_session', (q) => q.eq('sessionKey', args.sessionKey))
      .collect()

    if (events.length === 0) {
      return {
        sessionKey: args.sessionKey,
        eventCount: 0,
        lastEventAt: undefined,
      }
    }

    const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp)
    const latestEvent = sortedEvents[0]

    return {
      sessionKey: args.sessionKey,
      eventCount: events.length,
      lastEventAt: new Date(latestEvent.timestamp).toISOString(),
      agentName: extractAgentName(args.sessionKey),
    }
  },
})

/**
 * Extract agent name from session key
 * e.g., "agent:crawfather:main" -> "crawfather"
 */
function extractAgentName(sessionKey: string): string | undefined {
  const parts = sessionKey.split(':')
  if (parts.length >= 2 && parts[0] === 'agent') {
    return parts[1]
  }
  return undefined
}

/**
 * Delete old events (for cleanup/maintenance)
 */
export const deleteOldEvents = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000

    const oldEvents = await ctx.db
      .query('openclawEvents')
      .filter((q) => q.lt(q.field('createdAt'), cutoffTime))
      .collect()

    for (const event of oldEvents) {
      await ctx.db.delete(event._id)
    }

    return { deleted: oldEvents.length }
  },
})
