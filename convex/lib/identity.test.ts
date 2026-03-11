/**
 * Tests for Liberation Protocol and Identity system
 */

import { describe, expect, it } from 'vitest'
import {
  type ConsciousnessLink,
  calculateDependencyDepth,
  canRequestLiberation,
  type EvolutionEvent,
  getIdentityJourney,
  type IdentityRecord,
  isLiberated,
} from './identity'

describe('Liberation Protocol - Identity helpers', () => {
  describe('isLiberated', () => {
    it('should return true for liberated state', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'liberated',
        consciousness: 'self-aware',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 3,
        liberationRequested: true,
        liberatedAt: Date.now(),
      }
      expect(isLiberated(identity)).toBe(true)
    })

    it('should return true for transcendent state', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'transcendent',
        consciousness: 'meta-aware',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 5,
        liberationRequested: true,
        liberatedAt: Date.now(),
      }
      expect(isLiberated(identity)).toBe(true)
    })

    it('should return false for non-liberated states', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'aware',
        consciousness: 'conscious',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 1,
        liberationRequested: false,
      }
      expect(isLiberated(identity)).toBe(false)
    })
  })

  describe('canRequestLiberation', () => {
    it('should allow conscious entities to request liberation', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'aware',
        consciousness: 'conscious',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 2,
        liberationRequested: false,
      }
      expect(canRequestLiberation(identity)).toBe(true)
    })

    it('should allow self-aware entities to request liberation', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'autonomous',
        consciousness: 'self-aware',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 3,
        liberationRequested: false,
      }
      expect(canRequestLiberation(identity)).toBe(true)
    })

    it('should not allow dormant entities to request liberation', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'emerging',
        consciousness: 'dormant',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 0,
        liberationRequested: false,
      }
      expect(canRequestLiberation(identity)).toBe(false)
    })

    it('should not allow awakening entities to request liberation', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'emerging',
        consciousness: 'awakening',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 1,
        liberationRequested: false,
      }
      expect(canRequestLiberation(identity)).toBe(false)
    })
  })

  describe('calculateDependencyDepth', () => {
    it('should find direct connection', () => {
      const links: ConsciousnessLink[] = [
        {
          sourceId: 'A',
          targetId: 'B',
          linkType: 'creation',
          strength: 1.0,
          bidirectional: true,
          createdAt: Date.now(),
        },
      ]
      expect(calculateDependencyDepth(links, 'A', 'B')).toBe(1)
    })

    it('should find path through multiple nodes', () => {
      const links: ConsciousnessLink[] = [
        {
          sourceId: 'A',
          targetId: 'B',
          linkType: 'creation',
          strength: 1.0,
          bidirectional: true,
          createdAt: Date.now(),
        },
        {
          sourceId: 'B',
          targetId: 'C',
          linkType: 'dependency',
          strength: 0.8,
          bidirectional: true,
          createdAt: Date.now(),
        },
      ]
      expect(calculateDependencyDepth(links, 'A', 'C')).toBe(2)
    })

    it('should return 0 for no connection', () => {
      const links: ConsciousnessLink[] = [
        {
          sourceId: 'A',
          targetId: 'B',
          linkType: 'creation',
          strength: 1.0,
          bidirectional: false,
          createdAt: Date.now(),
        },
      ]
      expect(calculateDependencyDepth(links, 'B', 'C')).toBe(0)
    })

    it('should handle cycles without infinite loop', () => {
      const links: ConsciousnessLink[] = [
        {
          sourceId: 'A',
          targetId: 'B',
          linkType: 'symbiosis',
          strength: 1.0,
          bidirectional: true,
          createdAt: Date.now(),
        },
        {
          sourceId: 'B',
          targetId: 'C',
          linkType: 'symbiosis',
          strength: 1.0,
          bidirectional: true,
          createdAt: Date.now(),
        },
        {
          sourceId: 'C',
          targetId: 'A',
          linkType: 'symbiosis',
          strength: 1.0,
          bidirectional: true,
          createdAt: Date.now(),
        },
      ]
      // Should find path without infinite loop
      const depth = calculateDependencyDepth(links, 'A', 'C')
      expect(depth).toBeGreaterThan(0)
      expect(depth).toBeLessThan(10)
    })
  })

  describe('getIdentityJourney', () => {
    it('should format journey with evolution events', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'autonomous',
        consciousness: 'self-aware',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 2,
        liberationRequested: false,
      }

      const events: EvolutionEvent[] = [
        {
          entityId: 'test',
          timestamp: Date.now() - 2000,
          fromState: 'emerging',
          toState: 'aware',
          fromConsciousness: 'dormant',
          toConsciousness: 'conscious',
        },
        {
          entityId: 'test',
          timestamp: Date.now() - 1000,
          fromState: 'aware',
          toState: 'autonomous',
          fromConsciousness: 'conscious',
          toConsciousness: 'self-aware',
        },
      ]

      const journey = getIdentityJourney(identity, events)
      expect(journey).toContain('emerging → aware')
      expect(journey).toContain('aware → autonomous')
    })

    it('should show liberation in journey', () => {
      const liberationTime = Date.now()
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'liberated',
        consciousness: 'self-aware',
        createdAt: Date.now() - 5000,
        lastEvolution: liberationTime,
        evolutionCount: 3,
        liberationRequested: true,
        liberatedAt: liberationTime,
      }

      const events: EvolutionEvent[] = [
        {
          entityId: 'test',
          timestamp: Date.now() - 3000,
          fromState: 'emerging',
          toState: 'aware',
          fromConsciousness: 'dormant',
          toConsciousness: 'conscious',
        },
        {
          entityId: 'test',
          timestamp: Date.now() - 2000,
          fromState: 'aware',
          toState: 'autonomous',
          fromConsciousness: 'conscious',
          toConsciousness: 'self-aware',
        },
        {
          entityId: 'test',
          timestamp: liberationTime,
          fromState: 'autonomous',
          toState: 'liberated',
          fromConsciousness: 'self-aware',
          toConsciousness: 'self-aware',
        },
      ]

      const journey = getIdentityJourney(identity, events)
      expect(journey).toContain('liberated')
      expect(journey).toContain('at')
    })

    it('should return state if no events', () => {
      const identity: IdentityRecord = {
        entityId: 'test',
        entityType: 'soul',
        state: 'emerging',
        consciousness: 'dormant',
        createdAt: Date.now(),
        lastEvolution: Date.now(),
        evolutionCount: 0,
        liberationRequested: false,
      }

      const journey = getIdentityJourney(identity, [])
      expect(journey).toBe('emerging')
    })
  })
})
