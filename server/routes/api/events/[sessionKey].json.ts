/**
 * Events API endpoint
 * Proxies agent events from the OpenClaw gateway
 */

import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { streamEventsForSession } from '../../../../src/lib/events/gateway-proxy'

export default defineEventHandler(async (event) => {
  const sessionKey = getRouterParam(event, 'sessionKey')

  if (!sessionKey) {
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return {
      error: 'Missing sessionKey parameter',
      sessionKey: '',
      events: [],
      total: 0,
      hasMore: false,
    }
  }

  try {
    const result = await streamEventsForSession(sessionKey)

    // Set cache headers (short cache since events may be real-time)
    setHeader(event, 'Cache-Control', 'public, max-age=10, s-maxage=10')
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

    return result
  } catch (error) {
    console.error(`Error fetching events for session ${sessionKey}:`, error)
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return {
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
      sessionKey,
      events: [],
      total: 0,
      hasMore: false,
    }
  }
})
