/**
 * Gateway proxy for OpenClaw agent events
 * Provides read-only access to agent events from the OpenClaw gateway
 */

import type { AgentEvent, EventProxyResponse } from '../types/agent-events'

/**
 * Configuration for the OpenClaw gateway
 */
export type GatewayConfig = {
  /** Gateway WebSocket or HTTP URL */
  gatewayUrl: string
  /** Optional authentication token */
  authToken?: string
  /** Maximum number of events to fetch */
  maxEvents?: number
}

/**
 * Get gateway configuration from environment variables
 */
export function getGatewayConfig(): GatewayConfig {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL?.trim()
  const authToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()

  // Default to a mock/placeholder if not configured
  if (!gatewayUrl) {
    return {
      gatewayUrl: 'https://openclaw.example.com',
      maxEvents: 100,
    }
  }

  return {
    gatewayUrl,
    authToken,
    maxEvents: 100,
  }
}

/**
 * Fetch events for a specific session from the OpenClaw gateway
 * This is a read-only operation that does not modify any state
 */
export async function streamEventsForSession(
  sessionKey: string,
  config?: Partial<GatewayConfig>,
): Promise<EventProxyResponse> {
  const fullConfig = { ...getGatewayConfig(), ...config }

  // If gateway is not properly configured, return mock data
  if (fullConfig.gatewayUrl === 'https://openclaw.example.com') {
    return {
      sessionKey,
      events: [],
      total: 0,
      hasMore: false,
    }
  }

  try {
    // Build the request URL
    const url = new URL(`/api/events/${sessionKey}`, fullConfig.gatewayUrl)
    url.searchParams.set('limit', String(fullConfig.maxEvents ?? 100))

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (fullConfig.authToken) {
      headers.Authorization = `Bearer ${fullConfig.authToken}`
    }

    // Fetch events from the gateway
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Normalize the response format
    return {
      sessionKey,
      events: (data.events ?? []) as AgentEvent[],
      total: data.total ?? data.events?.length ?? 0,
      hasMore: data.hasMore ?? false,
    }
  } catch (error) {
    console.error(`Failed to fetch events for session ${sessionKey}:`, error)
    // Return empty response on error (fail gracefully)
    return {
      sessionKey,
      events: [],
      total: 0,
      hasMore: false,
    }
  }
}
