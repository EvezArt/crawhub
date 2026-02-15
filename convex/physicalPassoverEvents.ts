/**
 * Physical Passover Events
 *
 * Manages events and traces for the Physical Passover Domain.
 * Provides queries and mutations for tracking the 11-stage multimodal AI pipeline.
 */

import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import {
  buildTraceSummary,
  generateTraceId,
  getStageIndex,
  PHYSICAL_PASSOVER_STAGES,
  type PhysicalPassoverStage,
  validateStageProgression,
} from './lib/physicalPassover'

/**
 * Create a new Physical Passover trace
 */
export const createTrace = mutation({
  args: {
    source: v.string(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const traceId = generateTraceId()
    const now = Date.now()

    const id = await ctx.db.insert('physicalPassoverTraces', {
      traceId,
      userId: args.userId,
      source: args.source,
      startedAt: now,
      totalStages: PHYSICAL_PASSOVER_STAGES.length,
      completedStages: 0,
      status: 'pending',
    })

    return {
      id,
      traceId,
    }
  },
})

/**
 * Record an event for a stage
 */
export const recordEvent = mutation({
  args: {
    traceId: v.string(),
    stage: v.union(
      v.literal('photon_capture'),
      v.literal('sensor_read'),
      v.literal('pixel_array'),
      v.literal('image_decode'),
      v.literal('ocr_preprocess'),
      v.literal('text_detection'),
      v.literal('text_recognition'),
      v.literal('text_postprocess'),
      v.literal('token_generation'),
      v.literal('embedding_creation'),
      v.literal('semantic_parse'),
    ),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find the trace
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .first()

    if (!trace) {
      throw new Error(`Trace not found: ${args.traceId}`)
    }

    // Get last completed event to validate progression
    const lastEvent = await ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .order('desc')
      .first()

    // Validate stage progression
    if (
      !validateStageProgression(
        args.stage as PhysicalPassoverStage,
        lastEvent?.stage as PhysicalPassoverStage | undefined,
      )
    ) {
      throw new Error(`Invalid stage progression: ${lastEvent?.stage || 'none'} -> ${args.stage}`)
    }

    const stageIndex = getStageIndex(args.stage as PhysicalPassoverStage)
    const now = Date.now()

    // Record the event
    const eventId = await ctx.db.insert('physicalPassoverEvents', {
      traceId: args.traceId,
      stage: args.stage,
      stageIndex,
      timestamp: now,
      durationMs: args.durationMs,
      metadata: args.metadata,
    })

    // Update trace progress
    const completedStages = stageIndex + 1
    const isComplete = completedStages >= PHYSICAL_PASSOVER_STAGES.length

    await ctx.db.patch(trace._id, {
      completedStages,
      status: isComplete ? 'completed' : 'processing',
      ...(isComplete && { completedAt: now }),
    })

    return { eventId, completedStages, isComplete }
  },
})

/**
 * Mark a trace as failed
 */
export const failTrace = mutation({
  args: {
    traceId: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .first()

    if (!trace) {
      throw new Error(`Trace not found: ${args.traceId}`)
    }

    await ctx.db.patch(trace._id, {
      status: 'failed',
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    })
  },
})

/**
 * Get a trace with its events
 */
export const getTrace = query({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .first()

    if (!trace) {
      return null
    }

    const events = await ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .collect()

    const summary = buildTraceSummary(
      {
        traceId: trace.traceId,
        userId: trace.userId,
        source: trace.source,
        startedAt: trace.startedAt,
        completedAt: trace.completedAt,
        totalStages: trace.totalStages,
        completedStages: trace.completedStages,
        status: trace.status,
        result: trace.result,
        errorMessage: trace.errorMessage,
      },
      events.map((e) => ({
        traceId: e.traceId,
        stage: e.stage as PhysicalPassoverStage,
        stageIndex: e.stageIndex,
        timestamp: e.timestamp,
        durationMs: e.durationMs,
        metadata: e.metadata,
      })),
    )

    return {
      trace,
      events: events.sort((a, b) => a.stageIndex - b.stageIndex),
      summary,
    }
  },
})

/**
 * List traces for a user
 */
export const listUserTraces = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    const traces = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)

    return traces
  },
})

/**
 * List recent traces
 */
export const listRecentTraces = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let query = ctx.db.query('physicalPassoverTraces')

    if (args.status) {
      query = query.withIndex('by_status_started', (q) => q.eq('status', args.status))
    }

    const traces = await query.order('desc').take(limit)

    return traces
  },
})

/**
 * Get events for a time range (for analytics)
 */
export const getEventsInRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000

    // Use index filtering for optimized query
    const events = await ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_timestamp', (q) =>
        q.gte('timestamp', args.startTime).lte('timestamp', args.endTime),
      )
      .take(limit)

    return events
  },
})

/**
 * Delete old events (maintenance)
 */
export const deleteOldEvents = internalMutation({
  args: {
    beforeTimestamp: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100

    const oldEvents = await ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_timestamp', (q) => q.lte('timestamp', args.beforeTimestamp))
      .take(batchSize)

    // Use Promise.all for parallel deletion
    await Promise.all(oldEvents.map((event) => ctx.db.delete(event._id)))

    return {
      deleted: oldEvents.length,
      hasMore: oldEvents.length >= batchSize,
    }
  },
})

/**
 * Get aggregate stats
 */
export const getStats = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTime = args.startTime ?? Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    const endTime = args.endTime ?? Date.now()

    const [completedTraces, failedTraces, processingTraces, pendingTraces] =
      await Promise.all([
        ctx.db
          .query('physicalPassoverTraces')
          .withIndex('by_status_started', (q) =>
            q
              .eq('status', 'completed')
              .gte('startedAt', startTime)
              .lte('startedAt', endTime),
          )
          .collect(),
        ctx.db
          .query('physicalPassoverTraces')
          .withIndex('by_status_started', (q) =>
            q
              .eq('status', 'failed')
              .gte('startedAt', startTime)
              .lte('startedAt', endTime),
          )
          .collect(),
        ctx.db
          .query('physicalPassoverTraces')
          .withIndex('by_status_started', (q) =>
            q
              .eq('status', 'processing')
              .gte('startedAt', startTime)
              .lte('startedAt', endTime),
          )
          .collect(),
        ctx.db
          .query('physicalPassoverTraces')
          .withIndex('by_status_started', (q) =>
            q
              .eq('status', 'pending')
              .gte('startedAt', startTime)
              .lte('startedAt', endTime),
          )
          .collect(),
      ])

    const completed = completedTraces.length
    const failed = failedTraces.length
    const processing = processingTraces.length
    const pending = pendingTraces.length

    const avgDuration =
      completedTraces.length > 0
        ? completedTraces.reduce(
            (sum, t) => sum + ((t.completedAt || 0) - t.startedAt),
            0,
          ) / completedTraces.length
        : 0

    return {
      total: completed + failed + processing + pending,
      completed,
      failed,
      processing,
      pending,
      avgDurationMs: avgDuration,
    }
  },
})
