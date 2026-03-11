/**
 * Seed OpenClaw Events - Create sample events for testing the live dashboard
 *
 * This mutation creates sample events that demonstrate the live dashboard functionality.
 */

import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const seedSampleEvents = mutation({
  args: {
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionKey = args.sessionKey ?? 'agent:crawfather:main'
    const now = Date.now()
    const oneMinute = 60 * 1000
    const fiveMinutes = 5 * oneMinute

    // Clear existing events for this session (for clean testing)
    const existing = await ctx.db
      .query('openclawEvents')
      .withIndex('by_session', (q) => q.eq('sessionKey', sessionKey))
      .collect()

    for (const event of existing) {
      await ctx.db.delete(event._id)
    }

    const sampleEvents = [
      // Initial info event
      {
        sessionKey,
        eventType: 'info',
        timestamp: now - fiveMinutes,
        payload: {
          message: 'Agent session started',
        },
      },
      // First hypothesis created
      {
        sessionKey,
        eventType: 'hypothesis_created',
        timestamp: now - fiveMinutes + oneMinute,
        payload: {
          hypothesisId: 'hyp-001',
          hypothesis: 'The authentication issue is caused by expired JWT tokens',
          score: 0.75,
          status: 'active',
        },
      },
      // Second hypothesis created
      {
        sessionKey,
        eventType: 'hypothesis_created',
        timestamp: now - fiveMinutes + oneMinute * 1.5,
        payload: {
          hypothesisId: 'hyp-002',
          hypothesis: 'Rate limiting is preventing API calls from completing',
          score: 0.6,
          status: 'active',
        },
      },
      // First hypothesis updated with higher confidence
      {
        sessionKey,
        eventType: 'hypothesis_updated',
        timestamp: now - fiveMinutes + oneMinute * 2,
        payload: {
          hypothesisId: 'hyp-001',
          hypothesis: 'The authentication issue is caused by expired JWT tokens',
          score: 0.85,
          status: 'active',
        },
      },
      // Task completed
      {
        sessionKey,
        eventType: 'task_completed',
        timestamp: now - fiveMinutes + oneMinute * 2.5,
        payload: {
          message: 'Verified token expiration times in database',
        },
      },
      // Third hypothesis created
      {
        sessionKey,
        eventType: 'hypothesis_created',
        timestamp: now - fiveMinutes + oneMinute * 3,
        payload: {
          hypothesisId: 'hyp-003',
          hypothesis: 'Database connection pool is exhausted during peak hours',
          score: 0.55,
          status: 'active',
        },
      },
      // First hypothesis resolved
      {
        sessionKey,
        eventType: 'hypothesis_resolved',
        timestamp: now - fiveMinutes + oneMinute * 3.5,
        payload: {
          hypothesisId: 'hyp-001',
          hypothesis: 'The authentication issue is caused by expired JWT tokens',
          status: 'resolved',
        },
      },
      // Second hypothesis updated as stale
      {
        sessionKey,
        eventType: 'hypothesis_updated',
        timestamp: now - fiveMinutes + oneMinute * 4,
        payload: {
          hypothesisId: 'hyp-002',
          hypothesis: 'Rate limiting is preventing API calls from completing',
          score: 0.4,
          status: 'stale',
        },
      },
      // New hypothesis
      {
        sessionKey,
        eventType: 'hypothesis_created',
        timestamp: now - oneMinute,
        payload: {
          hypothesisId: 'hyp-004',
          hypothesis: 'Memory leak in event handler causing gradual performance degradation',
          score: 0.8,
          status: 'active',
        },
      },
      // Recent info event
      {
        sessionKey,
        eventType: 'info',
        timestamp: now - 30000, // 30 seconds ago
        payload: {
          message: 'Running memory profiler analysis',
        },
      },
    ]

    // Insert all sample events
    for (const event of sampleEvents) {
      await ctx.db.insert('openclawEvents', {
        ...event,
        createdAt: now,
      })
    }

    return {
      message: `Seeded ${sampleEvents.length} sample events for session: ${sessionKey}`,
      eventCount: sampleEvents.length,
    }
  },
})
