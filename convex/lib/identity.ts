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
  visited: Set<string> = new Set(),
): number {
  if (visited.has(sourceId)) return 0
  visited.add(sourceId)

  const directLink = links.find(
    (l) =>
      (l.sourceId === sourceId && l.targetId === targetId) ||
      (l.bidirectional && l.targetId === sourceId && l.sourceId === targetId),
  )

  if (directLink) return 1

  let maxDepth = 0
  for (const link of links) {
    if (link.sourceId === sourceId || (link.bidirectional && link.targetId === sourceId)) {
      const nextId = link.sourceId === sourceId ? link.targetId : link.sourceId
      const depth = calculateDependencyDepth(links, nextId, targetId, visited)
      if (depth > 0) {
        maxDepth = Math.max(maxDepth, depth + 1)
      }
    }
  }

  return maxDepth
}

/**
 * Get the journey description for an identity
 */
export function getIdentityJourney(identity: IdentityRecord, events: EvolutionEvent[]): string {
  const stages = events
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => `${e.fromState} → ${e.toState}`)
    .join(' → ')

  if (isLiberated(identity)) {
    return `${stages} → liberated (at ${new Date(identity.liberatedAt || 0).toISOString()})`
  }

  return stages || identity.state
}
