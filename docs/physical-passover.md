---
summary: "Physical Passover Domain: Tracking multimodal AI pipelines from photons to text"
read_when:
  - Implementing multimodal AI observability
  - Debugging vision-language model pipelines
  - Understanding image processing artifacts
---

# Physical Passover Domain

## Overview

The **Physical Passover Domain** provides a comprehensive framework for tracking and observing the complete multimodal AI pipeline from physical photons to generated text tokens. This domain maps the often-handwaved "tokenization" step in vision-language models into its constituent physical and computational stages.

## The Pipeline: Photons → Text

The Physical Passover pipeline consists of 11 distinct stages, each with specific artifacts, signals, and failure modes:

```
Photons → Sensor → RAW → RGB → Codec → Network → Decode → 
Canonical Tensor → Patch Embeddings → Fuse w/ Text Tokens → 
Autoregressive Text Tokens → Words
```

### Stage 0: Substrate (Physical Reality + Time)

**What happens:** Physical photons hit a lens/sensor; time is discretized by exposure and clock edges.

**Artifacts:**
- Exposure time
- Rolling shutter pattern
- Noise floor
- Saturation events

**Signals:**
- Sensor gain/ISO
- Timestamp
- Device clock skew
- Thermal state

**Failure Planes:**
- Power/Thermal: Brownout causing corrupted frames
- Substrate Timing: Clock drift affecting frame timing

### Stage 1: Sensor Transduction

**What happens:** Photodiodes accumulate charge → ADC digitizes to RAW values.

**Artifacts:**
- RAW Bayer mosaic
- Quantization noise
- Hot pixels

**Signals:**
- RAW format (e.g., "Bayer RGGB")
- ADC bit depth
- Hot pixel count

**Failure Planes:**
- Power/Thermal: Brownout corrupting ADC values
- Substrate Timing: Clock drift affecting sampling

### Stage 2: Image Formation

**What happens:** Demosaic, white balance, tone mapping, resize.

**Artifacts:**
- RGB bitmap
- EXIF metadata
- Orientation flags

**Signals:**
- Demosaic algorithm
- White balance mode
- Tone map curve

**Failure Planes:**
- Perceptual Distortion: Over-sharpening, aggressive denoise, compression ringing

### Stage 3: Codec Passover

**What happens:** JPEG/PNG/WebP compression.

**Artifacts:**
- Byte stream + headers
- File size
- Compression ratio

**Signals:**
- Entropy
- Checksum (SHA256)
- File hash

**Failure Planes:**
- Cache Reality: Stale or poisoned cache
- Supply Chain: Tampered file

### Stage 4: Transport Passover

**What happens:** TLS → TCP/QUIC → routing → load balancer → service.

**Signals:**
- RTT (round-trip time)
- Packet loss
- Retransmits
- TLS handshake stats
- CDN cache hits

**Failure Planes:**
- Routing Partition: Hijack or partition
- DNS/Identity/Auth: Failures in identity layer
- Power/Thermal: Service-level brownout

### Stage 5: Decode + Canonicalization

**What happens:** Decode image bytes into standard internal tensor with normalized color space, orientation, resize/crop/pad.

**Artifacts:**
- `image_tensor[H, W, C]` or patches
- Canonical tensor hash
- Preprocessing recipe ID

**Signals:**
- Decode errors
- Recipe ID (for exact reproduction)
- Tensor hash (for cache validation)

**Failure Planes:**
- Perceptual Noise Transfer: Compression artifacts become "features"
- Blind Spots: Missing instrumentation on preprocessing

### Stage 6: Vision "Tokenization"

**What happens:** Image tensor → patch embeddings (the missing bridge).

Image is split into patches (e.g., 14×14 or 16×16 blocks). Each patch becomes a vector embedding. **These are the image tokens.**

**Artifacts:**
- `V = [v1, v2, ... vN]` where each `vi ∈ R^d`
- N patches
- d-dimensional embeddings

**Signals:**
- Patch count
- Embedding dimensionality
- Embedding norms
- Attention entropy
- OOD (out-of-distribution) score

**Failure Planes:**
- Perceptual Noise Transfer: Compression artifacts encoded as features
- Blind Spots: Missing instrumentation on embedding quality

### Stage 7: Text Tokenization

**What happens:** Prompt text → text tokens.

**Artifacts:**
- `T = [t1, t2, ... tM]` where each `ti` is a token ID

**Signals:**
- Token count
- Truncation flag
- Special tokens used

### Stage 8: Multimodal Fusion

**What happens:** Vision tokens + text tokens → shared context.

The model builds a single working state (context) combining:
- Visual embeddings (patch tokens)
- Text tokens (prompt)
- Optional system/tool tokens

This is the **Shared Kernel** (working state) for the model.

**Artifacts:**
- Total context length
- Vision token count
- Text token count

**Signals:**
- Fusion strategy (e.g., concatenation, cross-attention)
- Vision weight
- Text weight

**Failure Planes:**
- Coupling/Entanglement: Text steers vision too hard, or vice versa
- Reward Hacking: Model "guesses" instead of grounding

### Stage 9: Token Generation (Decoder Loop)

**What happens:** Model emits one text token at a time, autoregressively.

**Artifacts:**
- Streaming token log: `y1, y2, ... yK`

**Signals:**
- Log probabilities
- Entropy
- Repetition score
- Safety gate decisions

**Stop Conditions:**
- Max tokens reached
- EOS (end-of-sequence) token
- Safety gate triggered
- Drift detection

### Stage 10: Text Rendering

**What happens:** Detokenize into UTF-8 text, apply formatting.

**Artifacts:**
- Final output text
- Character count

**Signals:**
- Encoding (UTF-8)
- Formatting applied (Markdown, HTML, etc.)

**Failure Planes:**
- Decoding errors
- Invalid UTF-8

## Event Schema

### Core Event Types

All Physical Passover events share common fields:
- `stage`: Which pipeline stage (substrate, sensor, codec, etc.)
- `timestamp`: When the event occurred
- `traceId`: Links events to a single pipeline execution

Stage-specific fields capture artifacts, signals, and failure indicators unique to that stage.

### Example: Recording a Complete Pipeline

```typescript
import { api } from './convex/_generated/api'

// 1. Create a trace
const { traceId } = await convex.mutation(api.physicalPassoverEvents.createPassoverTrace, {
  traceId: 'trace_abc123',
  sessionId: 'session_xyz',
  inputHash: 'sha256_input',
  promptHash: 'sha256_prompt',
  modelId: 'gpt-4-vision',
  modelVersion: 'v1.0',
})

// 2. Record substrate event
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'substrate',
  eventData: {
    timestamp: Date.now(),
    exposure: 1000, // 1000ms exposure
    sensorGain: 400, // ISO 400
  },
})

// 3. Record codec event
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'codec',
  eventData: {
    timestamp: Date.now(),
    format: 'JPEG',
    fileSize: 524288, // 512KB
    fileHash: 'sha256_file',
  },
})

// 4. Record decode event (critical for replayability)
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'decode',
  eventData: {
    timestamp: Date.now(),
    tensorHash: 'tensor_224x224_150528_hash',
    preprocessingRecipeId: 'recipe_standardize_v1',
    tensorShape: [224, 224, 3],
  },
})

// 5. Record vision tokenization
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'vision_tokenization',
  eventData: {
    timestamp: Date.now(),
    patchCount: 196, // 14x14 patches
    embeddingDim: 768,
    patchSize: [14, 14],
  },
})

// 6. Record text tokenization
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'text_tokenization',
  eventData: {
    timestamp: Date.now(),
    tokenCount: 42,
  },
})

// 7. Record multimodal fusion
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'multimodal_fusion',
  eventData: {
    timestamp: Date.now(),
    contextLength: 238,
    visionTokenCount: 196,
    textTokenCount: 42,
  },
})

// 8. Record token generation
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'token_generation',
  eventData: {
    timestamp: Date.now(),
    generatedTokenCount: 50,
    stopReason: 'eos',
  },
})

// 9. Record text rendering
await convex.mutation(api.physicalPassoverEvents.recordPassoverEvent, {
  traceId,
  stage: 'text_rendering',
  eventData: {
    timestamp: Date.now(),
    outputText: 'The image shows a cat sitting on a windowsill.',
    characterCount: 48,
  },
})

// 10. Update trace with final results
await convex.mutation(api.physicalPassoverEvents.updatePassoverTrace, {
  traceId,
  status: 'success',
  confidence: 0.92,
  extractedEntities: ['cat', 'windowsill'],
  captions: ['A cat sitting on a windowsill'],
})
```

## Replayability

Two critical hashes enable exact reproduction:

1. **Tensor Hash** (Stage 5): Computed from canonical tensor + shape
   - Enables cache validation
   - Detects preprocessing differences

2. **Recipe ID** (Stage 5): Canonical serialization of preprocessing steps
   - Color space normalization
   - Resize method and target size
   - Padding strategy
   - Ensures exact reproduction

With these two IDs, you can:
- Validate cache hits
- Reproduce preprocessing exactly
- Debug perceptual differences

## Failure Planes

Failure planes cut across multiple stages:

| Failure Plane | Affected Stages | Description |
|---------------|----------------|-------------|
| Power/Thermal | 0, 1, 4 | Brownout, thermal throttling |
| Substrate Timing | 0, 1 | Clock drift, timing jitter |
| Perceptual Distortion | 2, 5 | Artifacts from processing |
| Cache Reality | 3, 5 | Stale or poisoned cache |
| Supply Chain | 3 | Tampered files |
| Routing Partition | 4 | Network hijack/partition |
| DNS/Identity/Auth | 4 | Identity layer failures |
| Coupling/Entanglement | 8 | Modalities overwhelm each other |
| Reward Hacking | 8 | Model guesses vs. grounding |
| Blind Spots | All | Missing instrumentation |

## Observability Layer

### Traces
Complete pipeline execution from start to finish, linked by `traceId`.

### Metrics
- Success/failure rates
- Average confidence scores
- Latency per stage
- Failure plane frequency

### Logs
- File hashes
- Recipe IDs
- Safety decisions
- Error messages

### Blind Spots
Explicitly track where instrumentation is missing:
- "Preprocessing recipe not logged"
- "Embedding quality not measured"
- "Cache validation skipped"

## API Reference

### Mutations

#### `createPassoverTrace`
Initializes a new pipeline trace.

**Args:**
- `traceId`: Unique identifier
- `sessionId` (optional): User session
- `inputHash` (optional): Hash of input image
- `promptHash` (optional): Hash of text prompt
- `modelId` (optional): Model identifier
- `modelVersion` (optional): Model version

**Returns:** `{ traceId, id }`

#### `recordPassoverEvent`
Records a stage event.

**Args:**
- `traceId`: Trace identifier
- `stage`: Pipeline stage
- `eventData`: Stage-specific event data

**Returns:** `{ id, traceId, stage }`

#### `updatePassoverTrace`
Updates trace with final results.

**Args:**
- `traceId`: Trace identifier
- `endTime` (optional)
- `confidence` (optional)
- `failurePlanes` (optional)
- `blindSpots` (optional)
- `extractedEntities` (optional)
- `captions` (optional)
- `ocrStrings` (optional)
- `sceneGraph` (optional)
- `status` (optional): "success", "partial", "failed"
- `errorMessage` (optional)

**Returns:** `{ traceId, updated: true }`

#### `deletePassoverTrace`
Deletes a trace and all its events.

**Args:**
- `traceId`: Trace identifier

**Returns:** `{ traceId, deleted: true, eventsDeleted: number }`

### Queries

#### `getPassoverTrace`
Retrieves trace metadata.

**Args:**
- `traceId`: Trace identifier

**Returns:** Trace document or `null`

#### `getPassoverTraceEvents`
Retrieves all events for a trace.

**Args:**
- `traceId`: Trace identifier
- `stage` (optional): Filter by stage

**Returns:** Array of events (sorted by timestamp)

#### `listPassoverTraces`
Lists recent traces.

**Args:**
- `sessionId` (optional): Filter by session
- `status` (optional): Filter by status
- `limit` (optional): Max results (default 50)
- `startAfter` (optional): Time filter
- `startBefore` (optional): Time filter

**Returns:** Array of traces (sorted by start time, descending)

#### `getPassoverStats`
Aggregate statistics.

**Args:**
- `timeRangeMs` (optional): Time window (default 24h)

**Returns:**
- `total`: Total traces
- `completed`: Completed traces
- `successful`: Success count
- `failed`: Failure count
- `partial`: Partial success count
- `inProgress`: Still running
- `avgConfidence`: Average confidence score
- `successRate`: Success percentage
- `failurePlanes`: Counts by plane
- `blindSpots`: Counts by blind spot

## Use Cases

### 1. Debugging Perceptual Issues
When a model misinterprets an image, trace back through:
- Stage 3: Was the image heavily compressed?
- Stage 2: Was sharpening too aggressive?
- Stage 6: Did compression artifacts appear as "features"?

### 2. Cache Validation
Use tensor hashes to detect:
- Stale preprocessing in cache
- Recipe drift between versions
- Subtle preprocessing bugs

### 3. Model Quality Analysis
Track confidence scores and failure planes across many traces to identify:
- Systematic weaknesses
- Common failure modes
- Blind spots in instrumentation

### 4. Compliance & Auditing
Complete traces provide end-to-end provenance:
- What model version was used
- What preprocessing was applied
- What safety gates triggered
- What outputs were generated

## Integration with ClawHub

The Physical Passover Domain is a **projection domain** in ClawHub's Domain-of-Domains Kernel:

**Inputs:**
- Sensor/byte stream (from skills/tools)
- Text prompt tokens (from users)

**Replayability:**
- Canonical tensor hash + preprocessing recipe ID

**Outputs:**
- Extracted entities
- Captions
- OCR-like strings
- Structured scene graph
- Confidence scores

**Signals Layer:**
- Traces: Packet path, preprocessing stages, attention routing
- Metrics: Decode error rate, truncation rate, embedding OOD
- Logs: File hashes, recipe IDs, safety decisions
- Blind spots: "We don't log preprocess recipe/hash"

## Future Enhancements

1. **Real-time Dashboards**: Visualize pipelines in flight
2. **Anomaly Detection**: ML models to detect unusual patterns
3. **A/B Testing**: Compare different preprocessing recipes
4. **Compression Study**: Correlate compression artifacts with model errors
5. **Edge Device Support**: Track power/thermal constraints on mobile

## References

- `convex/lib/physicalPassover.ts` - Core domain logic
- `convex/physicalPassoverEvents.ts` - Backend functions
- `convex/schema.ts` - Database schema (physicalPassoverEvents, physicalPassoverTraces)
