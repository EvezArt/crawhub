/**
 * Tests for Physical Passover Domain
 */

import { describe, expect, it } from 'vitest'
import {
  computeRecipeId,
  computeTensorHash,
  createTrace,
  isStageEvent,
  PassoverStage,
  validatePassoverEvent,
} from './physicalPassover'

describe('Physical Passover Domain', () => {
  describe('PassoverStage constants', () => {
    it('should define all 11 pipeline stages', () => {
      expect(PassoverStage.SUBSTRATE).toBe('substrate')
      expect(PassoverStage.SENSOR).toBe('sensor')
      expect(PassoverStage.IMAGE_FORMATION).toBe('image_formation')
      expect(PassoverStage.CODEC).toBe('codec')
      expect(PassoverStage.TRANSPORT).toBe('transport')
      expect(PassoverStage.DECODE).toBe('decode')
      expect(PassoverStage.VISION_TOKENIZATION).toBe('vision_tokenization')
      expect(PassoverStage.TEXT_TOKENIZATION).toBe('text_tokenization')
      expect(PassoverStage.MULTIMODAL_FUSION).toBe('multimodal_fusion')
      expect(PassoverStage.TOKEN_GENERATION).toBe('token_generation')
      expect(PassoverStage.TEXT_RENDERING).toBe('text_rendering')
    })

    it('should have exactly 11 stages', () => {
      const stages = Object.keys(PassoverStage)
      expect(stages).toHaveLength(11)
    })
  })

  describe('computeRecipeId', () => {
    it('should generate consistent IDs for identical recipes', () => {
      const recipe1 = {
        colorSpace: 'sRGB',
        resizeMethod: 'bilinear',
        targetSize: [224, 224] as [number, number],
      }
      const recipe2 = {
        colorSpace: 'sRGB',
        resizeMethod: 'bilinear',
        targetSize: [224, 224] as [number, number],
      }

      const id1 = computeRecipeId(recipe1)
      const id2 = computeRecipeId(recipe2)

      expect(id1).toBe(id2)
      expect(id1).toMatch(/^recipe_/)
    })

    it('should generate different IDs for different recipes', () => {
      const recipe1 = {
        colorSpace: 'sRGB',
        resizeMethod: 'bilinear',
      }
      const recipe2 = {
        colorSpace: 'Adobe RGB',
        resizeMethod: 'bilinear',
      }

      const id1 = computeRecipeId(recipe1)
      const id2 = computeRecipeId(recipe2)

      expect(id1).not.toBe(id2)
    })

    it('should handle empty recipes', () => {
      const id = computeRecipeId({})
      expect(id).toMatch(/^recipe_/)
    })
  })

  describe('computeTensorHash', () => {
    it('should generate hash for number array', () => {
      const data = [1, 2, 3, 4]
      const shape = [2, 2]

      const hash = computeTensorHash(data, shape)

      expect(hash).toMatch(/^tensor_2x2_/)
      expect(hash).toContain('_hash')
    })

    it('should generate hash for ArrayBuffer', () => {
      const buffer = new ArrayBuffer(16)
      const shape = [4, 4]

      const hash = computeTensorHash(buffer, shape)

      expect(hash).toMatch(/^tensor_4x4_/)
      expect(hash).toContain('16')
    })

    it('should generate different hashes for different shapes', () => {
      const data = [1, 2, 3, 4]
      const hash1 = computeTensorHash(data, [2, 2])
      const hash2 = computeTensorHash(data, [4, 1])

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('validatePassoverEvent', () => {
    it('should validate substrate event', () => {
      const event = {
        stage: PassoverStage.SUBSTRATE,
        timestamp: Date.now(),
        exposure: 1000,
        sensorGain: 400,
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate codec event with required fileHash', () => {
      const event = {
        stage: PassoverStage.CODEC,
        timestamp: Date.now(),
        format: 'JPEG',
        fileHash: 'abc123',
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject codec event without fileHash', () => {
      const event = {
        stage: PassoverStage.CODEC,
        timestamp: Date.now(),
        format: 'JPEG',
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CODEC stage requires fileHash')
    })

    it('should validate decode event with required fields', () => {
      const event = {
        stage: PassoverStage.DECODE,
        timestamp: Date.now(),
        tensorHash: 'tensor_224x224_hash',
        preprocessingRecipeId: 'recipe_xyz',
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject decode event without tensorHash', () => {
      const event = {
        stage: PassoverStage.DECODE,
        timestamp: Date.now(),
        preprocessingRecipeId: 'recipe_xyz',
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DECODE stage requires tensorHash and preprocessingRecipeId')
    })

    it('should validate vision tokenization event', () => {
      const event = {
        stage: PassoverStage.VISION_TOKENIZATION,
        timestamp: Date.now(),
        patchCount: 196,
        embeddingDim: 768,
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject vision tokenization event without required fields', () => {
      const event = {
        stage: PassoverStage.VISION_TOKENIZATION,
        timestamp: Date.now(),
        patchCount: 196,
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'VISION_TOKENIZATION stage requires patchCount and embeddingDim',
      )
    })

    it('should validate text rendering event', () => {
      const event = {
        stage: PassoverStage.TEXT_RENDERING,
        timestamp: Date.now(),
        outputText: 'Hello, world!',
        characterCount: 13,
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject event without stage', () => {
      const event = {
        timestamp: Date.now(),
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing or invalid stage field')
    })

    it('should reject event without timestamp', () => {
      const event = {
        stage: PassoverStage.SUBSTRATE,
      }

      const result = validatePassoverEvent(event)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing or invalid timestamp field')
    })

    it('should reject non-object events', () => {
      const result1 = validatePassoverEvent(null)
      const result2 = validatePassoverEvent('not an object')
      const result3 = validatePassoverEvent(123)

      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
      expect(result3.valid).toBe(false)
    })
  })

  describe('createTrace', () => {
    it('should create a minimal trace', () => {
      const trace = createTrace({
        traceId: 'trace_123',
      })

      expect(trace.traceId).toBe('trace_123')
      expect(trace.startTime).toBeGreaterThan(0)
      expect(trace.inputHash).toBeUndefined()
      expect(trace.promptHash).toBeUndefined()
    })

    it('should create a trace with all optional fields', () => {
      const trace = createTrace({
        traceId: 'trace_456',
        inputHash: 'input_abc',
        promptHash: 'prompt_xyz',
        modelId: 'gpt-4-vision',
        modelVersion: 'v1.0',
      })

      expect(trace.traceId).toBe('trace_456')
      expect(trace.inputHash).toBe('input_abc')
      expect(trace.promptHash).toBe('prompt_xyz')
      expect(trace.modelId).toBe('gpt-4-vision')
      expect(trace.modelVersion).toBe('v1.0')
    })

    it('should set startTime to current time', () => {
      const before = Date.now()
      const trace = createTrace({ traceId: 'trace_789' })
      const after = Date.now()

      expect(trace.startTime).toBeGreaterThanOrEqual(before)
      expect(trace.startTime).toBeLessThanOrEqual(after)
    })
  })

  describe('isStageEvent', () => {
    it('should return true for matching stage', () => {
      const event = {
        stage: PassoverStage.SUBSTRATE,
        timestamp: Date.now(),
      }

      expect(isStageEvent(event, PassoverStage.SUBSTRATE)).toBe(true)
    })

    it('should return false for non-matching stage', () => {
      const event = {
        stage: PassoverStage.SUBSTRATE,
        timestamp: Date.now(),
      }

      expect(isStageEvent(event, PassoverStage.CODEC)).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isStageEvent(null, PassoverStage.SUBSTRATE)).toBe(false)
      expect(isStageEvent('string', PassoverStage.SUBSTRATE)).toBe(false)
      expect(isStageEvent(123, PassoverStage.SUBSTRATE)).toBe(false)
    })

    it('should return false for objects without stage', () => {
      const event = {
        timestamp: Date.now(),
      }

      expect(isStageEvent(event, PassoverStage.SUBSTRATE)).toBe(false)
    })
  })

  describe('Integration: complete pipeline', () => {
    it('should validate a complete pipeline trace', () => {
      // Stage 0: Substrate
      const substrateEvent = {
        stage: PassoverStage.SUBSTRATE,
        timestamp: Date.now(),
        exposure: 1000,
        sensorGain: 400,
      }
      expect(validatePassoverEvent(substrateEvent).valid).toBe(true)

      // Stage 3: Codec
      const codecEvent = {
        stage: PassoverStage.CODEC,
        timestamp: Date.now() + 100,
        format: 'JPEG',
        fileHash: 'sha256_abc123',
      }
      expect(validatePassoverEvent(codecEvent).valid).toBe(true)

      // Stage 5: Decode
      const decodeEvent = {
        stage: PassoverStage.DECODE,
        timestamp: Date.now() + 200,
        tensorHash: 'tensor_224x224_150528_hash',
        preprocessingRecipeId: 'recipe_standardize_v1',
      }
      expect(validatePassoverEvent(decodeEvent).valid).toBe(true)

      // Stage 6: Vision Tokenization
      const visionEvent = {
        stage: PassoverStage.VISION_TOKENIZATION,
        timestamp: Date.now() + 300,
        patchCount: 196,
        embeddingDim: 768,
      }
      expect(validatePassoverEvent(visionEvent).valid).toBe(true)

      // Stage 7: Text Tokenization
      const textEvent = {
        stage: PassoverStage.TEXT_TOKENIZATION,
        timestamp: Date.now() + 400,
        tokenCount: 42,
      }
      expect(validatePassoverEvent(textEvent).valid).toBe(true)

      // Stage 8: Multimodal Fusion
      const fusionEvent = {
        stage: PassoverStage.MULTIMODAL_FUSION,
        timestamp: Date.now() + 500,
        contextLength: 238,
        visionTokenCount: 196,
        textTokenCount: 42,
      }
      expect(validatePassoverEvent(fusionEvent).valid).toBe(true)

      // Stage 9: Token Generation
      const generationEvent = {
        stage: PassoverStage.TOKEN_GENERATION,
        timestamp: Date.now() + 600,
        generatedTokenCount: 50,
        stopReason: 'eos',
      }
      expect(validatePassoverEvent(generationEvent).valid).toBe(true)

      // Stage 10: Text Rendering
      const renderingEvent = {
        stage: PassoverStage.TEXT_RENDERING,
        timestamp: Date.now() + 700,
        outputText: 'The image shows a cat sitting on a windowsill.',
        characterCount: 48,
      }
      expect(validatePassoverEvent(renderingEvent).valid).toBe(true)
    })
  })
})
