/**
 * Test for gateway proxy event types and helpers
 */

import { describe, expect, it } from 'vitest'
import type { AgentEvent, EventProxyResponse } from '../types/agent-events'
import { getGatewayConfig } from './gateway-proxy'

describe('Gateway proxy', () => {
  it('should have correct AgentEvent structure', () => {
    const event: AgentEvent = {
      id: 'event-123',
      sessionKey: 'session-456',
      type: 'agent.message',
      timestamp: Date.now(),
      payload: { content: 'test' },
      message: 'Test message',
    }
    expect(event.id).toBe('event-123')
    expect(event.sessionKey).toBe('session-456')
  })

  it('should have correct EventProxyResponse structure', () => {
    const response: EventProxyResponse = {
      sessionKey: 'session-123',
      events: [],
      total: 0,
      hasMore: false,
    }
    expect(response.sessionKey).toBe('session-123')
    expect(response.events).toHaveLength(0)
  })

  it('should get gateway config with defaults when env vars not set', () => {
    const config = getGatewayConfig()
    expect(config).toBeDefined()
    expect(config.gatewayUrl).toBeDefined()
    expect(config.maxEvents).toBe(100)
  })
})
