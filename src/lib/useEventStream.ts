/**
 * useEventStream - Hook for polling OpenClaw events
 *
 * Polls the events API at a regular interval and returns new events.
 * Automatically reconnects and handles errors.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentEvent, SessionInfo } from './openclaw-types'

interface UseEventStreamOptions {
  /** Session key to monitor (e.g., "agent:crawfather:main") */
  sessionKey: string
  /** Polling interval in milliseconds (default: 2000ms) */
  pollInterval?: number
  /** Whether to automatically start polling (default: true) */
  enabled?: boolean
}

interface EventStreamState {
  events: AgentEvent[]
  sessionInfo: SessionInfo | null
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to stream OpenClaw events via polling
 */
export function useEventStream(options: UseEventStreamOptions): EventStreamState {
  const { sessionKey, pollInterval = 2000, enabled = true } = options

  const [events, setEvents] = useState<AgentEvent[]>([])
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const lastTimestampRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sessionKey,
        limit: '100',
      })

      // Only fetch events since last known timestamp
      if (lastTimestampRef.current !== undefined) {
        params.set('since', lastTimestampRef.current.toString())
      }

      const response = await fetch(`/api/v1/openclaw/events?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.events && data.events.length > 0) {
        setEvents((prev) => {
          // Merge new events, avoiding duplicates
          const existingIds = new Set(prev.map((e) => e.id))
          const newEvents = data.events.filter((e: AgentEvent) => !existingIds.has(e.id))
          return [...prev, ...newEvents]
        })

        // Update last timestamp to the newest event
        const latestEvent = data.events[data.events.length - 1]
        lastTimestampRef.current = new Date(latestEvent.timestamp).getTime()
      }

      if (data.sessionInfo) {
        setSessionInfo(data.sessionInfo)
      }

      setError(null)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setIsLoading(false)
    }
  }, [sessionKey])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Initial fetch
    fetchEvents()

    // Set up polling
    intervalRef.current = setInterval(fetchEvents, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchEvents, pollInterval, enabled])

  return {
    events,
    sessionInfo,
    isLoading,
    error,
  }
}
