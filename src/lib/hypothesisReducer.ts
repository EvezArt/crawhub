/**
 * Hypothesis Reducer - Process events into hypothesis summaries
 *
 * Takes a stream of AgentEvents and derives the current state of all hypotheses.
 */

import type { AgentEvent, HypothesisStatus, HypothesisSummary } from './openclaw-types'

/**
 * Default confidence score for new hypotheses when not specified
 */
const DEFAULT_HYPOTHESIS_SCORE = 0.5

/**
 * Reduce events into a map of hypotheses
 */
export function reduceEventsToHypotheses(events: AgentEvent[]): Map<string, HypothesisSummary> {
  const hypotheses = new Map<string, HypothesisSummary>()

  for (const event of events) {
    const { payload } = event

    // Only process events that have hypothesis data
    if (!payload.hypothesisId) {
      continue
    }

    const hypothesisId = payload.hypothesisId

    switch (event.type) {
      case 'hypothesis_created': {
        if (!hypotheses.has(hypothesisId)) {
          hypotheses.set(hypothesisId, {
            id: hypothesisId,
            text: payload.hypothesis || 'Unknown hypothesis',
            score: payload.score ?? DEFAULT_HYPOTHESIS_SCORE,
            status: (payload.status as HypothesisStatus) || 'active',
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
            updateCount: 0,
          })
        }
        break
      }

      case 'hypothesis_updated': {
        const existing = hypotheses.get(hypothesisId)
        if (existing) {
          hypotheses.set(hypothesisId, {
            ...existing,
            text: payload.hypothesis || existing.text,
            score: payload.score ?? existing.score,
            status: (payload.status as HypothesisStatus) || existing.status,
            updatedAt: event.timestamp,
            updateCount: existing.updateCount + 1,
          })
        } else {
          // Create if doesn't exist (in case we missed the creation event)
          hypotheses.set(hypothesisId, {
            id: hypothesisId,
            text: payload.hypothesis || 'Unknown hypothesis',
            score: payload.score ?? DEFAULT_HYPOTHESIS_SCORE,
            status: (payload.status as HypothesisStatus) || 'active',
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
            updateCount: 1,
          })
        }
        break
      }

      case 'hypothesis_resolved': {
        const existing = hypotheses.get(hypothesisId)
        if (existing) {
          hypotheses.set(hypothesisId, {
            ...existing,
            status: 'resolved',
            updatedAt: event.timestamp,
          })
        }
        break
      }
    }
  }

  return hypotheses
}

/**
 * Sort hypotheses by priority:
 * 1. Active hypotheses with highest scores
 * 2. Stale hypotheses
 * 3. Resolved hypotheses (oldest first)
 */
export function sortHypotheses(hypotheses: HypothesisSummary[]): HypothesisSummary[] {
  return [...hypotheses].sort((a, b) => {
    // First by status priority
    const statusPriority = { active: 0, stale: 1, resolved: 2 }
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) {
      return statusDiff
    }

    // For active/stale, sort by score descending
    if (a.status !== 'resolved') {
      return b.score - a.score
    }

    // For resolved, sort by creation time (oldest first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

/**
 * Get hypotheses as a sorted array
 */
export function getHypothesesArray(
  hypotheses: Map<string, HypothesisSummary>,
): HypothesisSummary[] {
  return sortHypotheses(Array.from(hypotheses.values()))
}
