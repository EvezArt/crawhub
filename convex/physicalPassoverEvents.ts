/**
 * Physical Passover Events - Backend functions for tracking multimodal AI pipelines
 *
 * This module provides queries and mutations for recording and retrieving
 * Physical Passover pipeline events as they flow from photons to text.
 */

import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import {
  type PassoverStageType,
  PassoverStage,
  createTrace,
  validatePassoverEvent,
} from './lib/physicalPassover'

/**
 * Create a new Physical Passover trace
 *
 * This initializes tracking for a complete pipeline execution from
 * photons to text. Returns the traceId to be used for subsequent events.
 */
export const createPassoverTrace = mutation({
  args: {
    traceId: v.string(),
    sessionId: v.optional(v.string()),
    inputHash: v.optional(v.string()),
    promptHash: v.optional(v.string()),
    modelId: v.optional(v.string()),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create trace record
    const trace = createTrace({
      traceId: args.traceId,
      inputHash: args.inputHash,
      promptHash: args.promptHash,
      modelId: args.modelId,
      modelVersion: args.modelVersion,
    })

    const id = await ctx.db.insert('physicalPassoverTraces', {
      traceId: args.traceId,
      sessionId: args.sessionId,
      startTime: trace.startTime,
      inputHash: args.inputHash,
      promptHash: args.promptHash,
      modelId: args.modelId,
      modelVersion: args.modelVersion,
      createdAt: now,
    })

    return { traceId: args.traceId, id }
  },
})

/**
 * Record a Physical Passover event
 *
 * Records a single stage event (substrate, sensor, codec, etc.) as part
 * of a pipeline execution. Events are validated before insertion.
 */
export const recordPassoverEvent = mutation({
  args: {
    traceId: v.string(),
    stage: v.string(),
    eventData: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Construct the full event for validation
    const event = {
      stage: args.stage,
      timestamp: args.eventData.timestamp ?? now,
      ...args.eventData,
    }

    // Validate the event structure
    const validation = validatePassoverEvent(event)
    if (!validation.valid) {
      throw new Error(`Invalid passover event: ${validation.errors.join(', ')}`)
    }

    // Insert the event
    const id = await ctx.db.insert('physicalPassoverEvents', {
      traceId: args.traceId,
      stage: args.stage,
      timestamp: event.timestamp,
      eventData: args.eventData,
      createdAt: now,
    })

    return { id, traceId: args.traceId, stage: args.stage }
  },
})

/**
 * Update a Physical Passover trace with final results
 *
 * Called when a pipeline execution completes (or fails) to record
 * final outputs, confidence scores, and detected failure planes.
 */
export const updatePassoverTrace = mutation({
  args: {
    traceId: v.string(),
    endTime: v.optional(v.number()),
    confidence: v.optional(v.number()),
    failurePlanes: v.optional(v.array(v.string())),
    blindSpots: v.optional(v.array(v.string())),
    extractedEntities: v.optional(v.array(v.string())),
    captions: v.optional(v.array(v.string())),
    ocrStrings: v.optional(v.array(v.string())),
    sceneGraph: v.optional(v.any()),
    status: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the trace
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace_id', (q) => q.eq('traceId', args.traceId))
      .unique()

    if (!trace) {
      throw new Error(`Trace not found: ${args.traceId}`)
    }

    // Update with final results
    await ctx.db.patch(trace._id, {
      endTime: args.endTime ?? Date.now(),
      confidence: args.confidence,
      failurePlanes: args.failurePlanes,
      blindSpots: args.blindSpots,
      extractedEntities: args.extractedEntities,
      captions: args.captions,
      ocrStrings: args.ocrStrings,
      sceneGraph: args.sceneGraph,
      status: args.status,
      errorMessage: args.errorMessage,
    })

    return { traceId: args.traceId, updated: true }
  },
})

/**
 * Get a Physical Passover trace by ID
 *
 * Retrieves the trace metadata including final results.
 */
export const getPassoverTrace = query({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace_id', (q) => q.eq('traceId', args.traceId))
      .unique()

    return trace
  },
})

/**
 * Get all events for a Physical Passover trace
 *
 * Retrieves all stage events in chronological order for a given trace.
 * Useful for debugging and visualizing the complete pipeline execution.
 */
export const getPassoverTraceEvents = query({
  args: {
    traceId: v.string(),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))

    if (args.stage) {
      query = ctx.db
        .query('physicalPassoverEvents')
        .withIndex('by_trace_stage', (q) => q.eq('traceId', args.traceId).eq('stage', args.stage))
    }

    const events = await query.collect()

    // Sort by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp)

    return events
  },
})

/**
 * List recent Physical Passover traces
 *
 * Returns recent traces, optionally filtered by status, session, or time range.
 */
export const listPassoverTraces = query({
  args: {
    sessionId: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let query = ctx.db.query('physicalPassoverTraces')

    if (args.sessionId) {
      query = query.withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    } else if (args.status) {
      query = query.withIndex('by_status', (q) => q.eq('status', args.status))
    } else {
      query = query.withIndex('by_start_time')
    }

    let traces = await query.collect()

    // Apply time filters
    if (args.startAfter || args.startBefore) {
      traces = traces.filter((trace) => {
        if (args.startAfter && trace.startTime <= args.startAfter) return false
        if (args.startBefore && trace.startTime >= args.startBefore) return false
        return true
      })
    }

    // Sort by start time descending (most recent first)
    traces.sort((a, b) => b.startTime - a.startTime)

    // Limit results
    return traces.slice(0, limit)
  },
})

/**
 * Get statistics about Physical Passover traces
 *
 * Returns aggregate statistics about pipeline executions:
 * - Total traces
 * - Success/failure rates
 * - Average confidence scores
 * - Common failure planes
 */
export const getPassoverStats = query({
  args: {
    timeRangeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRangeMs = args.timeRangeMs ?? 24 * 60 * 60 * 1000 // Default: last 24 hours
    const cutoffTime = Date.now() - timeRangeMs

    const traces = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_start_time')
      .collect()

    // Filter to time range
    const recentTraces = traces.filter((t) => t.startTime >= cutoffTime)

    // Calculate statistics
    const total = recentTraces.length
    const completed = recentTraces.filter((t) => t.endTime).length
    const successful = recentTraces.filter((t) => t.status === 'success').length
    const failed = recentTraces.filter((t) => t.status === 'failed').length
    const partial = recentTraces.filter((t) => t.status === 'partial').length

    // Average confidence (only for traces with confidence scores)
    const tracesWithConfidence = recentTraces.filter((t) => t.confidence !== undefined)
    const avgConfidence =
      tracesWithConfidence.length > 0
        ? tracesWithConfidence.reduce((sum, t) => sum + (t.confidence ?? 0), 0) /
          tracesWithConfidence.length
        : null

    // Count failure planes
    const failurePlaneCounts: Record<string, number> = {}
    for (const trace of recentTraces) {
      if (trace.failurePlanes) {
        for (const plane of trace.failurePlanes) {
          failurePlaneCounts[plane] = (failurePlaneCounts[plane] ?? 0) + 1
        }
      }
    }

    // Count blind spots
    const blindSpotCounts: Record<string, number> = {}
    for (const trace of recentTraces) {
      if (trace.blindSpots) {
        for (const spot of trace.blindSpots) {
          blindSpotCounts[spot] = (blindSpotCounts[spot] ?? 0) + 1
        }
      }
    }

    return {
      timeRangeMs,
      total,
      completed,
      successful,
      failed,
      partial,
      inProgress: total - completed,
      avgConfidence,
      successRate: total > 0 ? successful / total : null,
      failurePlanes: failurePlaneCounts,
      blindSpots: blindSpotCounts,
    }
  },
})

/**
 * Delete a Physical Passover trace and all its events
 *
 * Useful for cleaning up test data or removing traces that contain
 * sensitive information.
 */
export const deletePassoverTrace = mutation({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find and delete the trace
    const trace = await ctx.db
      .query('physicalPassoverTraces')
      .withIndex('by_trace_id', (q) => q.eq('traceId', args.traceId))
      .unique()

    if (!trace) {
      throw new Error(`Trace not found: ${args.traceId}`)
    }

    await ctx.db.delete(trace._id)

    // Delete all events for this trace
    const events = await ctx.db
      .query('physicalPassoverEvents')
      .withIndex('by_trace', (q) => q.eq('traceId', args.traceId))
      .collect()

    for (const event of events) {
      await ctx.db.delete(event._id)
    }

    return { traceId: args.traceId, deleted: true, eventsDeleted: events.length }
  },
})
