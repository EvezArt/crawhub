# Quantum Hardware Inline Access

This document describes the quantum hardware inline access feature, which provides advanced API access tokens with enhanced capabilities for proving unconventional access patterns.

## Overview

Quantum access tokens are a specialized type of API token that support advanced capabilities beyond standard authentication. These tokens enable inline access validation and hardware-level proof generation, allowing systems to prove capabilities that couldn't be achieved through conventional access methods.

## Token Types

### Standard Tokens
- Prefix: `clh_`
- Basic API authentication
- No special capabilities

### Quantum Tokens
- Prefix: `clhq_`
- Enhanced API authentication
- Support for multiple capabilities:
  - `inline-access`: Direct inline validation of access rights
  - `hardware-proof`: Hardware-level access verification
  - `conventional-bypass`: Alternative access methods beyond conventional patterns

## Creating a Quantum Token

### Via Convex Mutation

```typescript
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

const createToken = useMutation(api.tokens.create)

// Create a quantum token with specific capabilities
const result = await createToken({
  label: 'My Quantum Token',
  tokenType: 'quantum',
  capabilities: ['inline-access', 'hardware-proof']
})

console.log(result.token) // clhq_...
console.log(result.tokenType) // 'quantum'
```

## Proving Access

### Via HTTP API

Use the quantum token to prove access capabilities:

```bash
curl -X POST https://your-app.convex.site/api/v1/quantum/prove \
  -H "Authorization: Bearer clhq_..." \
  -H "Content-Type: application/json" \
  -d '{
    "capability": "inline-access",
    "method": "direct-validation",
    "metadata": {
      "context": "production-access",
      "requestId": "req-123"
    }
  }'
```

Response:
```json
{
  "success": true,
  "proof": {
    "proofId": "...",
    "verified": true,
    "capabilities": ["inline-access", "hardware-proof"],
    "timestamp": 1234567890
  }
}
```

### Via Convex Mutation

```typescript
const proveAccess = useMutation(api.quantumAccess.proveInlineAccess)

const proof = await proveAccess({
  tokenId: tokenId,
  capability: 'hardware-proof',
  method: 'quantum-validation',
  metadata: { environment: 'production' }
})
```

## Validating Proofs

### Via HTTP API

```bash
curl "https://your-app.convex.site/api/v1/quantum/validate?proofId=..." \
  -H "Authorization: Bearer clhq_..."
```

Response:
```json
{
  "proofId": "...",
  "proofType": "inline",
  "capability": "inline-access",
  "method": "direct-validation",
  "timestamp": 1234567890,
  "verified": true,
  "tokenType": "quantum",
  "tokenLabel": "My Quantum Token"
}
```

### Via Convex Query

```typescript
const validateProof = useQuery(api.quantumAccess.validateProof, {
  proofId: proofId
})
```

## Listing Your Proofs

```typescript
const myProofs = useQuery(api.quantumAccess.getMyProofs, {
  limit: 50
})

// Returns array of proofs with:
// - proofType: 'inline' | 'hardware' | 'conventional'
// - capability: string
// - method: string
// - verified: boolean
// - createdAt: number
```

## Schema

### API Tokens Table

```typescript
{
  userId: Id<'users'>
  label: string
  prefix: string
  tokenHash: string
  tokenType?: 'standard' | 'quantum'
  quantumCapabilities?: string[]
  createdAt: number
  lastUsedAt?: number
  revokedAt?: number
}
```

### Quantum Access Proofs Table

```typescript
{
  userId: Id<'users'>
  tokenId: Id<'apiTokens'>
  proofType: 'inline' | 'hardware' | 'conventional'
  capability: string
  proofData: {
    method: string
    timestamp: number
    metadata?: any
  }
  verified: boolean
  createdAt: number
}
```

## Security Considerations

1. **Token Storage**: Quantum tokens should be stored securely, just like standard API tokens
2. **Capability Scope**: Only grant the capabilities that are actually needed
3. **Proof Validation**: Always validate proofs before trusting the access grant
4. **Revocation**: Revoking a quantum token invalidates all associated proofs
5. **Audit Trail**: All proof generation is logged for audit purposes

## Use Cases

- **Inline Access Validation**: Prove access rights without traditional authentication flows
- **Hardware-Level Verification**: Demonstrate hardware-backed access capabilities
- **Unconventional Access Patterns**: Support new access methods beyond conventional approaches
- **Multi-Factor Proofs**: Chain multiple proof types for enhanced security
- **Real-Time Validation**: Immediate inline validation without additional round trips

## Example: Complete Flow

```typescript
// 1. Create quantum token
const { token, tokenId } = await createToken({
  label: 'Production Quantum Access',
  tokenType: 'quantum',
  capabilities: ['inline-access', 'hardware-proof']
})

// 2. Prove access with the token
const proof = await proveAccess({
  tokenId,
  capability: 'inline-access',
  method: 'direct-validation',
  metadata: { operation: 'sensitive-data-access' }
})

// 3. Validate the proof
const validation = await validateProof({
  proofId: proof.proofId
})

if (validation.verified) {
  // Access granted - proceed with operation
  console.log('Quantum access verified!')
}

// 4. List all proofs for auditing
const allProofs = await getMyProofs({ limit: 100 })
console.log(`Generated ${allProofs.length} proofs`)
```

## API Endpoints

- `POST /api/v1/quantum/prove` - Create access proof
- `GET /api/v1/quantum/validate` - Validate existing proof

## Convex Functions

- `tokens.create` - Create quantum token (mutation)
- `tokens.listMine` - List your tokens (query)
- `quantumAccess.proveInlineAccess` - Create proof (mutation)
- `quantumAccess.getMyProofs` - List your proofs (query)
- `quantumAccess.validateProof` - Validate proof (query)
- `quantumAccess.getProofsByToken` - Get proofs for specific token (query)
