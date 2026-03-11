/**
 * Tests for Physical Passover helper functions
 */

import { describe, expect, it } from 'vitest'
import {
  calculateTraceDuration,
  generateTraceId,
  getNextStage,
  getStageIndex,
  isTraceComplete,
  PHYSICAL_PASSOVER_STAGES,
  type PhysicalPassoverEvent,
  type PhysicalPassoverTrace,
  validateStageProgression,
} from './physicalPassover'

describe('Physical Passover helpers', () => {
  describe('generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId()
      const id2 = generateTraceId()
      expect(id1).toMatch(/^pp_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^pp_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('getStageIndex', () => {
    it('should return correct index for each stage', () => {
      expect(getStageIndex('photon_capture')).toBe(0)
      expect(getStageIndex('sensor_read')).toBe(1)
      expect(getStageIndex('semantic_parse')).toBe(10)
    })
  })

  describe('validateStageProgression', () => {
    it('should allow first stage without previous', () => {
      expect(validateStageProgression('photon_capture', undefined)).toBe(true)
    })

    it('should allow sequential progression', () => {
      expect(validateStageProgression('sensor_read', 'photon_capture')).toBe(true)
      expect(validateStageProgression('pixel_array', 'sensor_read')).toBe(true)
    })

    it('should reject non-sequential progression', () => {
      expect(validateStageProgression('pixel_array', 'photon_capture')).toBe(false)
      expect(validateStageProgression('semantic_parse', 'photon_capture')).toBe(false)
    })

    it('should reject starting with non-first stage', () => {
      expect(validateStageProgression('sensor_read', undefined)).toBe(false)
    })
  })

  describe('getNextStage', () => {
    it('should return next stage in sequence', () => {
      expect(getNextStage('photon_capture')).toBe('sensor_read')
      expect(getNextStage('sensor_read')).toBe('pixel_array')
    })

    it('should return null for last stage', () => {
      expect(getNextStage('semantic_parse')).toBe(null)
    })
  })

  describe('isTraceComplete', () => {
    it('should return true when all stages completed', () => {
      const trace: PhysicalPassoverTrace = {
        traceId: 'test',
        source: 'test',
        startedAt: Date.now(),
        totalStages: 11,
        completedStages: 11,
        status: 'completed',
      }
      expect(isTraceComplete(trace)).toBe(true)
    })

    it('should return false when stages incomplete', () => {
      const trace: PhysicalPassoverTrace = {
        traceId: 'test',
        source: 'test',
        startedAt: Date.now(),
        totalStages: 11,
        completedStages: 5,
        status: 'processing',
      }
      expect(isTraceComplete(trace)).toBe(false)
    })

    it('should return false when status is not completed', () => {
      const trace: PhysicalPassoverTrace = {
        traceId: 'test',
        source: 'test',
        startedAt: Date.now(),
        totalStages: 11,
        completedStages: 11,
        status: 'processing',
      }
      expect(isTraceComplete(trace)).toBe(false)
    })
  })

  describe('calculateTraceDuration', () => {
    it('should sum durations correctly', () => {
      const events: Array<Pick<PhysicalPassoverEvent, 'durationMs'>> = [
        { durationMs: 100 },
        { durationMs: 200 },
        { durationMs: 150 },
      ]
      expect(calculateTraceDuration(events)).toBe(450)
    })

    it('should handle missing durations', () => {
      const events: Array<Pick<PhysicalPassoverEvent, 'durationMs'>> = [
        { durationMs: 100 },
        {},
        { durationMs: 150 },
      ]
      expect(calculateTraceDuration(events)).toBe(250)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTraceDuration([])).toBe(0)
    })
  })

  describe('PHYSICAL_PASSOVER_STAGES', () => {
    it('should have exactly 11 stages', () => {
      expect(PHYSICAL_PASSOVER_STAGES).toHaveLength(11)
    })

    it('should have correct stage order', () => {
      expect(PHYSICAL_PASSOVER_STAGES[0]).toBe('photon_capture')
      expect(PHYSICAL_PASSOVER_STAGES[10]).toBe('semantic_parse')
    })
  })
})
