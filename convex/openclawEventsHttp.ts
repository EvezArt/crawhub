/**
 * OpenClaw Events HTTP API
 *
 * Provides HTTP endpoints for fetching and submitting OpenClaw agent events.
 */

import { api } from './_generated/api'
import { httpAction } from './_generated/server'

/**
 * Maximum number of events that can be requested in a single query
 */
const MAX_EVENT_LIMIT = 1000

/**
 * GET /api/v1/openclaw/events?sessionKey={key}&since={timestamp}
 *
 * Returns events for a specific session key.
 * Supports polling by providing a `since` timestamp to get only new events.
 */
export const getOpenclawEventsHttp = httpAction(async (ctx, request) => {
  const url = new URL(request.url)
  const sessionKey = url.searchParams.get('sessionKey') || 'agent:crawfather:main'
  const sinceStr = url.searchParams.get('since')
  const limitStr = url.searchParams.get('limit')

  // Validate and parse numeric parameters
  let sinceTimestamp: number | undefined
  if (sinceStr !== null) {
    const parsed = Number.parseInt(sinceStr, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid "since" parameter: must be a positive integer' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    sinceTimestamp = parsed
  }

  let limit = 100
  if (limitStr !== null) {
    const parsed = Number.parseInt(limitStr, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid "limit" parameter: must be a positive integer' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    // Enforce maximum limit to prevent resource exhaustion
    limit = Math.min(parsed, MAX_EVENT_LIMIT)
  }

  // Fetch events from the database
  const events = await ctx.runQuery(api.openclawEvents.listBySession, {
    sessionKey,
    limit,
    sinceTimestamp,
  })

  // Also get session info
  const sessionInfo = await ctx.runQuery(api.openclawEvents.getSessionInfo, {
    sessionKey,
  })

  // Transform to AgentEvent format
  const transformedEvents = events.map((event) => ({
    id: event._id,
    sessionKey: event.sessionKey,
    type: event.eventType,
    timestamp: new Date(event.timestamp).toISOString(),
    payload: event.payload || {},
  }))

  return new Response(
    JSON.stringify({
      sessionInfo,
      events: transformedEvents,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  )
})

/**
 * POST /api/v1/openclaw/events
 *
 * Submit a new OpenClaw event.
 * Body should be an AgentEvent (without id).
 */
export const postOpenclawEventHttp = httpAction(async (ctx, request) => {
  try {
    const body = await request.json()

    if (!body.sessionKey || !body.type || !body.timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionKey, type, timestamp' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const timestamp = new Date(body.timestamp).getTime()

    const eventId = await ctx.runMutation(api.openclawEvents.insert, {
      sessionKey: body.sessionKey,
      eventType: body.type,
      timestamp,
      payload: body.payload || {},
    })

    return new Response(JSON.stringify({ id: eventId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error posting OpenClaw event:', error)
    return new Response(JSON.stringify({ error: 'Failed to post event' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
