import { describe, expect, it } from 'vitest'
import {
  buildMerkleTree,
  computeHash,
  computeMerkleRoot,
  createCheckpoint,
  type GovernanceEvent,
  hashEvent,
  verifyCheckpoint,
} from './compute-merkle'

describe('Merkle Tree Computation', () => {
  describe('computeHash', () => {
    it('should compute SHA256 hash consistently', () => {
      const input = 'test data'
      const hash1 = computeHash(input)
      const hash2 = computeHash(input)
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = computeHash('data1')
      const hash2 = computeHash('data2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('hashEvent', () => {
    it('should hash governance events consistently', () => {
      const event: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:00Z',
        type: 'policy_change',
        repository: 'EvezArt/crawhub',
        actor: 'autopilot',
        data: { policy: 'thin-caller-ci', action: 'enabled' },
      }

      const hash1 = hashEvent(event)
      const hash2 = hashEvent(event)
      expect(hash1).toBe(hash2)
    })

    it('should ignore hash field when hashing', () => {
      const event1: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:00Z',
        type: 'policy_change',
        repository: 'EvezArt/crawhub',
        data: {},
      }

      const event2: GovernanceEvent = {
        ...event1,
        hash: 'existing-hash',
      }

      expect(hashEvent(event1)).toBe(hashEvent(event2))
    })

    it('should produce different hashes for different events', () => {
      const event1: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:00Z',
        type: 'policy_change',
        repository: 'EvezArt/crawhub',
        data: {},
      }

      const event2: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:01Z',
        type: 'policy_change',
        repository: 'EvezArt/crawhub',
        data: {},
      }

      expect(hashEvent(event1)).not.toBe(hashEvent(event2))
    })
  })

  describe('buildMerkleTree', () => {
    it('should return null for empty events', () => {
      const tree = buildMerkleTree([])
      expect(tree).toBeNull()
    })

    it('should build single-node tree for one event', () => {
      const event: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:00Z',
        type: 'test',
        repository: 'test/repo',
        data: {},
      }

      const tree = buildMerkleTree([event])
      expect(tree).toBeDefined()
      expect(tree?.left).toBeUndefined()
      expect(tree?.right).toBeUndefined()
      expect(tree?.data).toBeDefined()
    })

    it('should build two-level tree for two events', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test1',
          repository: 'test/repo',
          data: {},
        },
        {
          timestamp: '2026-02-12T00:00:01Z',
          type: 'test2',
          repository: 'test/repo',
          data: {},
        },
      ]

      const tree = buildMerkleTree(events)
      expect(tree).toBeDefined()
      expect(tree?.left).toBeDefined()
      expect(tree?.right).toBeDefined()
    })

    it('should handle odd number of events', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test1',
          repository: 'test/repo',
          data: {},
        },
        {
          timestamp: '2026-02-12T00:00:01Z',
          type: 'test2',
          repository: 'test/repo',
          data: {},
        },
        {
          timestamp: '2026-02-12T00:00:02Z',
          type: 'test3',
          repository: 'test/repo',
          data: {},
        },
      ]

      const tree = buildMerkleTree(events)
      expect(tree).toBeDefined()
    })
  })

  describe('computeMerkleRoot', () => {
    it('should return null for empty events', () => {
      const root = computeMerkleRoot([])
      expect(root).toBeNull()
    })

    it('should compute root for single event', () => {
      const event: GovernanceEvent = {
        timestamp: '2026-02-12T00:00:00Z',
        type: 'test',
        repository: 'test/repo',
        data: {},
      }

      const root = computeMerkleRoot([event])
      expect(root).toBeDefined()
      expect(root).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should compute consistent root for same events', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test1',
          repository: 'test/repo',
          data: {},
        },
        {
          timestamp: '2026-02-12T00:00:01Z',
          type: 'test2',
          repository: 'test/repo',
          data: {},
        },
      ]

      const root1 = computeMerkleRoot(events)
      const root2 = computeMerkleRoot(events)
      expect(root1).toBe(root2)
    })

    it('should compute different roots for different event orders', () => {
      const events1: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test1',
          repository: 'test/repo',
          data: {},
        },
        {
          timestamp: '2026-02-12T00:00:01Z',
          type: 'test2',
          repository: 'test/repo',
          data: {},
        },
      ]

      const events2 = [...events1].reverse()

      const root1 = computeMerkleRoot(events1)
      const root2 = computeMerkleRoot(events2)
      expect(root1).not.toBe(root2)
    })
  })

  describe('createCheckpoint and verifyCheckpoint', () => {
    it('should create valid checkpoint', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'policy_change',
          repository: 'EvezArt/crawhub',
          data: { policy: 'thin-caller-ci' },
        },
        {
          timestamp: '2026-02-12T00:00:01Z',
          type: 'drift_detected',
          repository: 'EvezArt/crawhub',
          data: { file: 'ci.yml' },
        },
      ]

      const checkpoint = createCheckpoint(events)
      expect(checkpoint.root_hash).toBeDefined()
      expect(checkpoint.event_count).toBe(2)
      expect(checkpoint.events).toHaveLength(2)
      expect(checkpoint.timestamp).toBeDefined()
    })

    it('should verify valid checkpoint', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test',
          repository: 'test/repo',
          data: {},
        },
      ]

      const checkpoint = createCheckpoint(events)
      const valid = verifyCheckpoint(checkpoint)
      expect(valid).toBe(true)
    })

    it('should detect tampered checkpoint', () => {
      const events: GovernanceEvent[] = [
        {
          timestamp: '2026-02-12T00:00:00Z',
          type: 'test',
          repository: 'test/repo',
          data: {},
        },
      ]

      const checkpoint = createCheckpoint(events)

      // Tamper with the checkpoint
      checkpoint.events[0].data = { tampered: true }

      const valid = verifyCheckpoint(checkpoint)
      expect(valid).toBe(false)
    })
  })
})
