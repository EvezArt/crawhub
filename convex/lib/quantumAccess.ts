import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type QuantumCapability = 'inline-access' | 'hardware-proof' | 'conventional-bypass'

export async function verifyQuantumToken(_ctx: QueryCtx | MutationCtx, token: Doc<'apiTokens'>) {
  if (token.tokenType !== 'quantum') {
    throw new Error('Token is not a quantum access token')
  }

  if (token.revokedAt) {
    throw new Error('Quantum token has been revoked')
  }

  return {
    userId: token.userId,
    capabilities: token.quantumCapabilities ?? [],
  }
}

export function hasCapability(
  capabilities: string[] | undefined,
  required: QuantumCapability,
): boolean {
  return capabilities?.includes(required) ?? false
}

export async function createAccessProof(
  ctx: MutationCtx,
  data: {
    userId: Doc<'users'>['_id']
    tokenId: Doc<'apiTokens'>['_id']
    proofType: 'inline' | 'hardware' | 'conventional'
    capability: string
    method: string
    metadata?: Record<string, unknown>
  },
) {
  const now = Date.now()

  const proofId = await ctx.db.insert('quantumAccessProofs', {
    userId: data.userId,
    tokenId: data.tokenId,
    proofType: data.proofType,
    capability: data.capability,
    proofData: {
      method: data.method,
      timestamp: now,
      metadata: data.metadata,
    },
    verified: true,
    createdAt: now,
  })

  return proofId
}

export async function validateInlineAccess(
  ctx: QueryCtx,
  tokenId: Doc<'apiTokens'>['_id'],
  capability: QuantumCapability,
) {
  const token = await ctx.db.get(tokenId)
  if (!token) throw new Error('Token not found')

  const { capabilities } = await verifyQuantumToken(ctx, token)

  if (!hasCapability(capabilities, capability)) {
    throw new Error(`Token does not have ${capability} capability`)
  }

  return { verified: true, capabilities }
}

export function generateProofSignature(
  tokenId: string,
  capability: string,
  timestamp: number,
): string {
  // Generate a deterministic proof signature based on token, capability, and timestamp
  const data = `${tokenId}:${capability}:${timestamp}`
  // Use a simple hash for the proof (in production, this would be more sophisticated)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return `proof_${Math.abs(hash).toString(16)}`
}
