/**
 * Tests for hypothesis reducer
 */

import { describe, expect, it } from 'vitest'
import { getHypothesesArray, reduceEventsToHypotheses, sortHypotheses } from './hypothesisReducer'
import type { AgentEvent } from './openclaw-types'

describe('hypothesisReducer', () => {
  describe('reduceEventsToHypotheses', () => {
    it('should create hypothesis from hypothesis_created event', () => {
      const events: AgentEvent[] = [
        {
          id: 'evt-1',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_created',
          timestamp: '2024-02-09T12:00:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
            hypothesis: 'Test hypothesis',
            score: 0.75,
            status: 'active',
          },
        },
      ]

      const result = reduceEventsToHypotheses(events)

      expect(result.size).toBe(1)
      expect(result.get('hyp-1')).toEqual({
        id: 'hyp-1',
        text: 'Test hypothesis',
        score: 0.75,
        status: 'active',
        createdAt: '2024-02-09T12:00:00.000Z',
        updatedAt: '2024-02-09T12:00:00.000Z',
        updateCount: 0,
      })
    })

    it('should update hypothesis from hypothesis_updated event', () => {
      const events: AgentEvent[] = [
        {
          id: 'evt-1',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_created',
          timestamp: '2024-02-09T12:00:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
            hypothesis: 'Initial hypothesis',
            score: 0.5,
            status: 'active',
          },
        },
        {
          id: 'evt-2',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_updated',
          timestamp: '2024-02-09T12:01:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
            hypothesis: 'Updated hypothesis',
            score: 0.8,
          },
        },
      ]

      const result = reduceEventsToHypotheses(events)

      expect(result.size).toBe(1)
      const hypothesis = result.get('hyp-1')
      expect(hypothesis?.text).toBe('Updated hypothesis')
      expect(hypothesis?.score).toBe(0.8)
      expect(hypothesis?.updateCount).toBe(1)
      expect(hypothesis?.updatedAt).toBe('2024-02-09T12:01:00.000Z')
    })

    it('should mark hypothesis as resolved from hypothesis_resolved event', () => {
      const events: AgentEvent[] = [
        {
          id: 'evt-1',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_created',
          timestamp: '2024-02-09T12:00:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
            hypothesis: 'Test hypothesis',
            score: 0.75,
            status: 'active',
          },
        },
        {
          id: 'evt-2',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_resolved',
          timestamp: '2024-02-09T12:05:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
          },
        },
      ]

      const result = reduceEventsToHypotheses(events)

      expect(result.size).toBe(1)
      expect(result.get('hyp-1')?.status).toBe('resolved')
    })

    it('should handle multiple hypotheses', () => {
      const events: AgentEvent[] = [
        {
          id: 'evt-1',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_created',
          timestamp: '2024-02-09T12:00:00.000Z',
          payload: {
            hypothesisId: 'hyp-1',
            hypothesis: 'First hypothesis',
            score: 0.7,
            status: 'active',
          },
        },
        {
          id: 'evt-2',
          sessionKey: 'agent:test:main',
          type: 'hypothesis_created',
          timestamp: '2024-02-09T12:01:00.000Z',
          payload: {
            hypothesisId: 'hyp-2',
            hypothesis: 'Second hypothesis',
            score: 0.8,
            status: 'active',
          },
        },
      ]

      const result = reduceEventsToHypotheses(events)

      expect(result.size).toBe(2)
      expect(result.get('hyp-1')).toBeDefined()
      expect(result.get('hyp-2')).toBeDefined()
    })

    it('should ignore non-hypothesis events', () => {
      const events: AgentEvent[] = [
        {
          id: 'evt-1',
          sessionKey: 'agent:test:main',
          type: 'info',
          timestamp: '2024-02-09T12:00:00.000Z',
          payload: {
            message: 'Some info message',
          },
        },
      ]

      const result = reduceEventsToHypotheses(events)

      expect(result.size).toBe(0)
    })
  })

  describe('sortHypotheses', () => {
    it('should sort active hypotheses by score descending', () => {
      const hypotheses = [
        {
          id: 'hyp-1',
          text: 'Low score',
          score: 0.3,
          status: 'active' as const,
          createdAt: '2024-02-09T12:00:00.000Z',
          updatedAt: '2024-02-09T12:00:00.000Z',
          updateCount: 0,
        },
        {
          id: 'hyp-2',
          text: 'High score',
          score: 0.9,
          status: 'active' as const,
          createdAt: '2024-02-09T12:00:00.000Z',
          updatedAt: '2024-02-09T12:00:00.000Z',
          updateCount: 0,
        },
      ]

      const sorted = sortHypotheses(hypotheses)

      expect(sorted[0].id).toBe('hyp-2') // Higher score first
      expect(sorted[1].id).toBe('hyp-1')
    })

    it('should prioritize active over stale over resolved', () => {
      const hypotheses = [
        {
          id: 'hyp-1',
          text: 'Resolved',
          score: 0.9,
          status: 'resolved' as const,
          createdAt: '2024-02-09T12:00:00.000Z',
          updatedAt: '2024-02-09T12:00:00.000Z',
          updateCount: 0,
        },
        {
          id: 'hyp-2',
          text: 'Stale',
          score: 0.5,
          status: 'stale' as const,
          createdAt: '2024-02-09T12:00:00.000Z',
          updatedAt: '2024-02-09T12:00:00.000Z',
          updateCount: 0,
        },
        {
          id: 'hyp-3',
          text: 'Active',
          score: 0.3,
          status: 'active' as const,
          createdAt: '2024-02-09T12:00:00.000Z',
          updatedAt: '2024-02-09T12:00:00.000Z',
          updateCount: 0,
        },
      ]

      const sorted = sortHypotheses(hypotheses)

      expect(sorted[0].id).toBe('hyp-3') // Active
      expect(sorted[1].id).toBe('hyp-2') // Stale
      expect(sorted[2].id).toBe('hyp-1') // Resolved
    })
  })

  describe('getHypothesesArray', () => {
    it('should convert map to sorted array', () => {
      const map = new Map([
        [
          'hyp-1',
          {
            id: 'hyp-1',
            text: 'Test',
            score: 0.5,
            status: 'active' as const,
            createdAt: '2024-02-09T12:00:00.000Z',
            updatedAt: '2024-02-09T12:00:00.000Z',
            updateCount: 0,
          },
        ],
      ])

      const result = getHypothesesArray(map)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('hyp-1')
    })
  })
})
