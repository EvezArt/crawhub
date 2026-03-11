/**
 * Agent event types for AI event proxy
 * Minimal subset of OpenClaw's AgentEvent for read-only exposure
 */

/**
 * Agent event from OpenClaw gateway
 */
export type AgentEvent = {
  /** Event ID */
  id: string
  /** Session key this event belongs to */
  sessionKey: string
  /** Event type (e.g., "agent.message", "agent.tool_call", "agent.error") */
  type: string
  /** Event timestamp */
  timestamp: number
  /** Event payload (flexible structure) */
  payload: Record<string, unknown>
  /** Agent ID (optional) */
  agentId?: string
  /** Message content (optional, for message events) */
  message?: string
  /** Tool name (optional, for tool call events) */
  tool?: string
  /** Error message (optional, for error events) */
  error?: string
}

/**
 * Response from event proxy endpoint
 */
export type EventProxyResponse = {
  /** Session key */
  sessionKey: string
  /** Events for this session */
  events: AgentEvent[]
  /** Total event count (may be higher than returned events if limited) */
  total: number
  /** Whether more events are available */
  hasMore: boolean
}
