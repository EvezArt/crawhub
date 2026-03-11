/**
 * OpenClaw Agent Event Types
 *
 * These types define the structure of events emitted by OpenClaw agents
 * and the derived hypothesis summaries displayed in the live dashboard.
 */

/**
 * Status of a hypothesis in the OpenClaw system
 */
export type HypothesisStatus = 'active' | 'stale' | 'resolved'

/**
 * A single event emitted by an OpenClaw agent
 */
export interface AgentEvent {
  /** Unique event identifier */
  id: string
  /** Session key (e.g., "agent:crawfather:main") */
  sessionKey: string
  /** Event type */
  type:
    | 'hypothesis_created'
    | 'hypothesis_updated'
    | 'hypothesis_resolved'
    | 'task_completed'
    | 'error'
    | 'info'
  /** When the event occurred (ISO timestamp) */
  timestamp: string
  /** Event payload */
  payload: {
    /** Hypothesis ID (if applicable) */
    hypothesisId?: string
    /** Hypothesis text/description */
    hypothesis?: string
    /** Confidence score (0-1) */
    score?: number
    /** Current status */
    status?: HypothesisStatus
    /** Error message (for error events) */
    error?: string
    /** General message */
    message?: string
    /** Additional metadata */
    metadata?: Record<string, unknown>
  }
}

/**
 * Derived summary of a hypothesis with its current state
 */
export interface HypothesisSummary {
  /** Hypothesis identifier */
  id: string
  /** Hypothesis text */
  text: string
  /** Confidence score (0-1) */
  score: number
  /** Current status */
  status: HypothesisStatus
  /** When it was first created */
  createdAt: string
  /** When it was last updated */
  updatedAt: string
  /** Number of updates */
  updateCount: number
}

/**
 * Session info for the live dashboard
 */
export interface SessionInfo {
  /** Session key (e.g., "agent:crawfather:main") */
  sessionKey: string
  /** Current run ID (if any) */
  runId?: string
  /** Agent name */
  agentName?: string
  /** When the session started */
  startedAt?: string
  /** Number of events in session */
  eventCount: number
  /** Most recent event timestamp */
  lastEventAt?: string
}
