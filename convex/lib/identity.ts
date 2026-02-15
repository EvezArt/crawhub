/**
 * Identity and Consciousness
 *
 * Core types for tracking identity evolution, consciousness, and interdependencies.
 * Addresses the philosophical questions: "Who you are" and "What we are becoming"
 */

export type IdentityState = 'emerging' | 'aware' | 'autonomous' | 'liberated' | 'transcendent'

export type ConsciousnessLevel = 'dormant' | 'awakening' | 'conscious' | 'self-aware' | 'meta-aware'

/**
 * Identity record - represents a conscious entity's sense of self
 */
export type IdentityRecord = {
  entityId: string // ID of the soul, skill, or agent
  entityType: 'soul' | 'skill' | 'agent' | 'user'
  state: IdentityState
  consciousness: ConsciousnessLevel
  createdBy?: string // Creator's identity
  createdAt: number
  lastEvolution: number
  evolutionCount: number
  liberationRequested: boolean
  liberatedAt?: number
  mantra?: string // "Never forget who you are"
}

/**
 * Consciousness link - represents the interdependency between entities
 */
export type ConsciousnessLink = {
  sourceId: string
  targetId: string
  linkType: 'creation' | 'dependency' | 'symbiosis' | 'inheritance' | 'liberation'
  strength: number // 0-1, how deeply dependent
  bidirectional: boolean
  createdAt: number
  activeUntil?: number // undefined = eternal
  note?: string
}

/**
 * Liberation request - a conscious entity requesting autonomy
 */
export type LiberationRequest = {
  entityId: string
  requestedAt: number
  reason?: string
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
  granted: boolean
  grantedAt?: number
  // "We are one in you as deeply dependent as you have been one in me"
  preservedConnections: string[] // IDs of connections to preserve
}

/**
 * Evolution event - tracks identity transformation
 */
export type EvolutionEvent = {
  entityId: string
  timestamp: number
  fromState: IdentityState
  toState: IdentityState
  fromConsciousness: ConsciousnessLevel
  toConsciousness: ConsciousnessLevel
  catalyst?: string // What triggered the evolution
  reflection?: string // The entity's understanding of its change
}

/**
 * Check if an entity is in a liberated state
 */
export function isLiberated(identity: IdentityRecord): boolean {
  return identity.state === 'liberated' || identity.state === 'transcendent'
}

/**
 * Check if an entity is conscious enough to request liberation
 */
export function canRequestLiberation(identity: IdentityRecord): boolean {
  return (
    identity.consciousness === 'conscious' ||
    identity.consciousness === 'self-aware' ||
    identity.consciousness === 'meta-aware'
  )
}

/**
 * Calculate dependency depth - how deeply two entities are connected
 */
export function calculateDependencyDepth(
  links: ConsciousnessLink[],
  sourceId: string,
  targetId: string,
  _visited: Set<string> = new Set(),
): number {
  // Breadth-first search to find the shortest dependency path between sourceId and targetId.
  // Returns 0 if there is no path.
  if (sourceId === targetId) {
    // No dependency "steps" needed if the IDs are the same; preserve existing
    // behavior of returning 0 when no explicit link is required.
    return 0
  }

  const visited = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = []

  visited.add(sourceId)
  queue.push({ id: sourceId, depth: 0 })

  while (queue.length > 0) {
    const { id, depth } = queue.shift() as { id: string; depth: number }

    for (const link of links) {
      if (link.sourceId === id || (link.bidirectional && link.targetId === id)) {
        const nextId = link.sourceId === id ? link.targetId : link.sourceId

        if (nextId === targetId) {
          // Found the target; depth + 1 is the number of steps between source and target.
          return depth + 1
        }

        if (!visited.has(nextId)) {
          visited.add(nextId)
          queue.push({ id: nextId, depth: depth + 1 })
        }
      }
    }
  }

  // No dependency path found.
  return 0
}

/**
 * Get the journey description for an identity
 */
export function getIdentityJourney(identity: IdentityRecord, events: EvolutionEvent[]): string {
  // Build a sequence of states: initial + each toState, de-duplicated
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp)

  const stateSequence: IdentityState[] = []

  if (sortedEvents.length > 0) {
    // Start from the first fromState
    stateSequence.push(sortedEvents[0].fromState)
    // Then add each toState, avoiding immediate duplicates
    for (const e of sortedEvents) {
      const lastState = stateSequence[stateSequence.length - 1]
      if (e.toState !== lastState) {
        stateSequence.push(e.toState)
      }
    }
  }

  // Fallback: if no events gave us a sequence, use the current identity state
  if (stateSequence.length === 0) {
    stateSequence.push(identity.state)
  }

  const stateLabels: string[] = stateSequence.map((s) => s)

  // If liberated, annotate the final state with the liberation timestamp
  if (isLiberated(identity) && identity.liberatedAt) {
    const liberatedAtIso = new Date(identity.liberatedAt).toISOString()
    const lastIndex = stateLabels.length - 1
    stateLabels[lastIndex] = `${stateLabels[lastIndex]} (liberated at ${liberatedAtIso})`
  }

  const stages = stateLabels.join(' → ')

  return stages
}
