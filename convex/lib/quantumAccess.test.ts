import { describe, expect, it } from 'vitest'
import {
  generateProofSignature,
  hasCapability,
  type QuantumCapability,
} from './quantumAccess'

describe('quantumAccess', () => {
  describe('hasCapability', () => {
    it('returns true when capability is present', () => {
      const capabilities = ['inline-access', 'hardware-proof']
      expect(hasCapability(capabilities, 'inline-access')).toBe(true)
      expect(hasCapability(capabilities, 'hardware-proof')).toBe(true)
    })

    it('returns false when capability is missing', () => {
      const capabilities = ['inline-access']
      expect(hasCapability(capabilities, 'hardware-proof')).toBe(false)
    })

    it('returns false for undefined capabilities', () => {
      expect(hasCapability(undefined, 'inline-access')).toBe(false)
    })

    it('returns false for empty capabilities array', () => {
      expect(hasCapability([], 'inline-access')).toBe(false)
    })
  })

  describe('generateProofSignature', () => {
    it('generates consistent signatures for same input', () => {
      const tokenId = 'token123'
      const capability = 'inline-access'
      const timestamp = 1234567890

      const sig1 = generateProofSignature(tokenId, capability, timestamp)
      const sig2 = generateProofSignature(tokenId, capability, timestamp)

      expect(sig1).toBe(sig2)
      expect(sig1).toMatch(/^proof_[0-9a-f]+$/)
    })

    it('generates different signatures for different inputs', () => {
      const timestamp = Date.now()

      const sig1 = generateProofSignature('token1', 'inline-access', timestamp)
      const sig2 = generateProofSignature('token2', 'inline-access', timestamp)
      const sig3 = generateProofSignature('token1', 'hardware-proof', timestamp)

      expect(sig1).not.toBe(sig2)
      expect(sig1).not.toBe(sig3)
      expect(sig2).not.toBe(sig3)
    })

    it('generates different signatures for different timestamps', () => {
      const tokenId = 'token123'
      const capability = 'inline-access'

      const sig1 = generateProofSignature(tokenId, capability, 1000)
      const sig2 = generateProofSignature(tokenId, capability, 2000)

      expect(sig1).not.toBe(sig2)
    })
  })
})
