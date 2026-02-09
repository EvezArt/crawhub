/**
 * Physical Passover Domain - Maps the complete pipeline from photons to text tokens
 *
 * This domain captures the entire multimodal AI pipeline:
 * Photons → Sensor → RAW → RGB → Codec → Network → Decode →
 * Canonical Tensor → Patch Embeddings → Fuse w/ Text Tokens →
 * Autoregressive Text Tokens → Words
 *
 * Each stage has specific artifacts, signals, and failure planes that need
 * to be tracked for observability, debugging, and quality assurance.
 */

import { v } from 'convex/values'

/**
 * Physical Passover Pipeline Stages (0-10)
 *
 * Each stage represents a transformation in the pipeline with specific
 * artifacts and potential failure modes.
 */
export const PassoverStage = {
  SUBSTRATE: 'substrate', // Physical photons + time discretization
  SENSOR: 'sensor', // Photons → electrons → numbers
  IMAGE_FORMATION: 'image_formation', // Numbers → pixels (demosaic, white balance, etc.)
  CODEC: 'codec', // Pixels → compressed bytes (JPEG/PNG/WebP)
  TRANSPORT: 'transport', // Bytes → packets → services (TLS/TCP/QUIC)
  DECODE: 'decode', // Bytes → canonical tensor
  VISION_TOKENIZATION: 'vision_tokenization', // Image → patch embeddings
  TEXT_TOKENIZATION: 'text_tokenization', // Prompt → text tokens
  MULTIMODAL_FUSION: 'multimodal_fusion', // Image tokens + text tokens → context
  TOKEN_GENERATION: 'token_generation', // Context → autoregressive text tokens
  TEXT_RENDERING: 'text_rendering', // Tokens → UTF-8 text
} as const

export type PassoverStageType = (typeof PassoverStage)[keyof typeof PassoverStage]

/**
 * Failure planes that can affect the pipeline at various stages
 */
export const FailurePlane = {
  POWER_THERMAL: 'power_thermal', // Power brownout, thermal throttling
  SUBSTRATE_TIMING: 'substrate_timing', // Clock drift, timing issues
  PERCEPTUAL_DISTORTION: 'perceptual_distortion', // Compression artifacts, over-sharpening
  CACHE_REALITY: 'cache_reality', // Stale/poisoned cache
  SUPPLY_CHAIN: 'supply_chain', // Tampered files
  ROUTING_PARTITION: 'routing_partition', // Network routing issues
  DNS_IDENTITY_AUTH: 'dns_identity_auth', // DNS/identity/auth failures
  COUPLING_ENTANGLEMENT: 'coupling_entanglement', // Text steers vision too hard
  REWARD_HACKING: 'reward_hacking', // Model guesses instead of grounding
  BLIND_SPOTS: 'blind_spots', // Missing instrumentation
} as const

export type FailurePlaneType = (typeof FailurePlane)[keyof typeof FailurePlane]

/**
 * Schema for substrate stage (Stage 0)
 * Physical photons hitting sensor, time discretization
 */
export const SubstrateEventSchema = v.object({
  stage: v.literal(PassoverStage.SUBSTRATE),
  timestamp: v.number(),
  // Signals
  exposure: v.optional(v.number()), // Exposure time in ms
  sensorGain: v.optional(v.number()), // ISO/gain setting
  clockSkew: v.optional(v.number()), // Device clock skew in ms
  thermalState: v.optional(v.string()), // Thermal state indicator
  // Artifacts
  rollingShutterPattern: v.optional(v.string()),
  noiseFloor: v.optional(v.number()),
  saturation: v.optional(v.boolean()),
})

/**
 * Schema for sensor transduction stage (Stage 1)
 * Photons → electrons → RAW values
 */
export const SensorEventSchema = v.object({
  stage: v.literal(PassoverStage.SENSOR),
  timestamp: v.number(),
  // Signals
  rawFormat: v.optional(v.string()), // e.g., "Bayer RGGB"
  bitDepth: v.optional(v.number()), // ADC bit depth
  quantizationNoise: v.optional(v.number()),
  hotPixelCount: v.optional(v.number()),
  // Failure indicators
  brownoutDetected: v.optional(v.boolean()),
  corruptedFrames: v.optional(v.number()),
})

/**
 * Schema for image formation stage (Stage 2)
 * RAW → RGB pixels (demosaic, white balance, tone map)
 */
export const ImageFormationEventSchema = v.object({
  stage: v.literal(PassoverStage.IMAGE_FORMATION),
  timestamp: v.number(),
  // Artifacts
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  colorSpace: v.optional(v.string()), // e.g., "sRGB", "Adobe RGB"
  orientation: v.optional(v.number()), // EXIF orientation
  // Signals
  demosaicAlgorithm: v.optional(v.string()),
  whiteBalanceMode: v.optional(v.string()),
  toneMapCurve: v.optional(v.string()),
  // Failure indicators
  overSharpening: v.optional(v.boolean()),
  aggressiveDenoise: v.optional(v.boolean()),
})

/**
 * Schema for codec passover stage (Stage 3)
 * Pixels → compressed bytes
 */
export const CodecEventSchema = v.object({
  stage: v.literal(PassoverStage.CODEC),
  timestamp: v.number(),
  // Artifacts
  format: v.optional(v.string()), // "JPEG", "PNG", "WebP"
  fileSize: v.optional(v.number()), // Bytes
  compressionRatio: v.optional(v.number()),
  // Signals
  entropy: v.optional(v.number()),
  checksum: v.optional(v.string()), // SHA256
  fileHash: v.string(), // Required for tracking
  // Failure indicators
  staleCached: v.optional(v.boolean()),
  tampered: v.optional(v.boolean()),
})

/**
 * Schema for transport passover stage (Stage 4)
 * Bytes → packets → services
 */
export const TransportEventSchema = v.object({
  stage: v.literal(PassoverStage.TRANSPORT),
  timestamp: v.number(),
  // Signals
  protocol: v.optional(v.string()), // "TLS", "TCP", "QUIC"
  rtt: v.optional(v.number()), // Round-trip time in ms
  packetLoss: v.optional(v.number()), // Packet loss percentage
  retransmits: v.optional(v.number()),
  tlsHandshakeTime: v.optional(v.number()), // ms
  cdnCacheHit: v.optional(v.boolean()),
  // Failure indicators
  routingPartition: v.optional(v.boolean()),
  dnsFailure: v.optional(v.boolean()),
  authFailure: v.optional(v.boolean()),
})

/**
 * Schema for decode + canonicalization stage (Stage 5)
 * Bytes → canonical tensor
 */
export const DecodeEventSchema = v.object({
  stage: v.literal(PassoverStage.DECODE),
  timestamp: v.number(),
  // Artifacts
  tensorShape: v.optional(v.array(v.number())), // [H, W, C]
  tensorHash: v.string(), // Required for replayability
  // Signals
  preprocessingRecipeId: v.string(), // Required for exact reproduction
  colorSpaceNormalization: v.optional(v.string()),
  resizeMethod: v.optional(v.string()),
  paddingStrategy: v.optional(v.string()),
  // Failure indicators
  decodeErrors: v.optional(v.number()),
  incompatibleFormat: v.optional(v.boolean()),
})

/**
 * Schema for vision tokenization stage (Stage 6)
 * Image → patch embeddings ("image tokens")
 */
export const VisionTokenizationEventSchema = v.object({
  stage: v.literal(PassoverStage.VISION_TOKENIZATION),
  timestamp: v.number(),
  // Artifacts
  patchCount: v.number(), // N patches
  embeddingDim: v.number(), // d dimensions per patch
  patchSize: v.optional(v.array(v.number())), // [height, width] e.g., [14, 14]
  // Signals
  embeddingNorms: v.optional(v.array(v.number())), // Norms of each patch embedding
  attentionEntropy: v.optional(v.number()),
  oodScore: v.optional(v.number()), // Out-of-distribution score
  // Failure indicators
  compressionArtifactsDetected: v.optional(v.boolean()),
  blindSpots: v.optional(v.array(v.string())), // Missing instrumentation areas
})

/**
 * Schema for text tokenization stage (Stage 7)
 * Prompt → text tokens
 */
export const TextTokenizationEventSchema = v.object({
  stage: v.literal(PassoverStage.TEXT_TOKENIZATION),
  timestamp: v.number(),
  // Artifacts
  tokenCount: v.number(), // M tokens
  tokenIds: v.optional(v.array(v.number())), // Actual token IDs (optional for privacy)
  // Signals
  truncated: v.optional(v.boolean()),
  specialTokensUsed: v.optional(v.array(v.string())),
  tokenizerVersion: v.optional(v.string()),
})

/**
 * Schema for multimodal fusion stage (Stage 8)
 * Image tokens + text tokens → shared context
 */
export const MultimodalFusionEventSchema = v.object({
  stage: v.literal(PassoverStage.MULTIMODAL_FUSION),
  timestamp: v.number(),
  // Artifacts
  contextLength: v.number(), // Total tokens in context
  visionTokenCount: v.number(),
  textTokenCount: v.number(),
  // Signals
  fusionStrategy: v.optional(v.string()), // e.g., "concatenation", "cross-attention"
  visionWeight: v.optional(v.number()), // How much vision influences output
  textWeight: v.optional(v.number()), // How much text influences output
  // Failure indicators
  textOverwhelmsVision: v.optional(v.boolean()),
  visionOverwhelmsText: v.optional(v.boolean()),
  rewardHacking: v.optional(v.boolean()), // Model guessing instead of grounding
})

/**
 * Schema for token generation stage (Stage 9)
 * Context → autoregressive text tokens
 */
export const TokenGenerationEventSchema = v.object({
  stage: v.literal(PassoverStage.TOKEN_GENERATION),
  timestamp: v.number(),
  // Artifacts
  generatedTokenCount: v.number(),
  tokenLog: v.optional(v.array(v.number())), // Sequence of generated token IDs
  // Signals
  avgLogprob: v.optional(v.number()), // Average log probability
  entropy: v.optional(v.number()), // Generation entropy
  repetitionScore: v.optional(v.number()),
  safetyGateDecisions: v.optional(v.array(v.string())),
  // Stop conditions
  stopReason: v.optional(v.string()), // "max_tokens", "eos", "safety", etc.
  truncationOccurred: v.optional(v.boolean()),
  driftDetected: v.optional(v.boolean()),
})

/**
 * Schema for text rendering stage (Stage 10)
 * Tokens → UTF-8 text
 */
export const TextRenderingEventSchema = v.object({
  stage: v.literal(PassoverStage.TEXT_RENDERING),
  timestamp: v.number(),
  // Artifacts
  outputText: v.string(), // Final rendered text
  characterCount: v.number(),
  // Signals
  encoding: v.optional(v.string()), // "UTF-8" typically
  formattingApplied: v.optional(v.array(v.string())), // Markdown, HTML, etc.
  // Failure indicators
  decodingErrors: v.optional(v.number()),
  invalidUtf8: v.optional(v.boolean()),
})

/**
 * Union type for all Physical Passover events
 */
export const PhysicalPassoverEventSchema = v.union(
  SubstrateEventSchema,
  SensorEventSchema,
  ImageFormationEventSchema,
  CodecEventSchema,
  TransportEventSchema,
  DecodeEventSchema,
  VisionTokenizationEventSchema,
  TextTokenizationEventSchema,
  MultimodalFusionEventSchema,
  TokenGenerationEventSchema,
  TextRenderingEventSchema,
)

/**
 * Schema for a complete Physical Passover pipeline trace
 * This captures an entire end-to-end execution from photons to text
 */
export const PhysicalPassoverTraceSchema = v.object({
  traceId: v.string(), // Unique identifier for this pipeline execution
  sessionId: v.optional(v.string()), // Optional user session ID
  startTime: v.number(),
  endTime: v.optional(v.number()),
  // Input identifiers for replayability
  inputHash: v.optional(v.string()), // Hash of original input (image bytes)
  promptHash: v.optional(v.string()), // Hash of text prompt
  // High-level metadata
  modelId: v.optional(v.string()), // Which model was used
  modelVersion: v.optional(v.string()),
  // Observability metadata
  confidence: v.optional(v.number()), // Overall confidence score
  failurePlanes: v.optional(v.array(v.string())), // Which failure planes triggered
  blindSpots: v.optional(v.array(v.string())), // Known instrumentation gaps
  // Extracted outputs
  extractedEntities: v.optional(v.array(v.string())),
  captions: v.optional(v.array(v.string())),
  ocrStrings: v.optional(v.array(v.string())),
  sceneGraph: v.optional(v.any()), // Structured scene representation
  // Status
  status: v.optional(v.string()), // "success", "partial", "failed"
  errorMessage: v.optional(v.string()),
})

/**
 * Compute a canonical hash for a preprocessing recipe
 * This ensures exact reproduction of preprocessing steps
 */
export function computeRecipeId(recipe: {
  colorSpace?: string
  resizeMethod?: string
  targetSize?: [number, number]
  normalization?: string
  paddingStrategy?: string
}): string {
  // Canonical serialization for consistent hashing
  // Sort keys and use a custom replacer to ensure deterministic output
  const sortedKeys = Object.keys(recipe).sort()
  const canonicalObj: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    canonicalObj[key] = recipe[key as keyof typeof recipe]
  }
  const canonical = JSON.stringify(canonicalObj)
  // In production, use a proper hash function (SHA256)
  // For now, use a simple hash based on the full canonical string
  let hash = 0
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash << 5) - hash + canonical.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36)
  return `recipe_${hashStr}`
}

/**
 * Compute a canonical hash for tensor data
 * This enables exact replayability and cache validation
 */
export function computeTensorHash(tensorData: ArrayBuffer | number[], shape: number[]): string {
  // In production, compute SHA256 over the tensor data + shape
  // For now, return a placeholder that includes shape info
  const shapeStr = shape.join('x')
  const sizeBytes =
    tensorData instanceof ArrayBuffer ? tensorData.byteLength : tensorData.length * 8
  return `tensor_${shapeStr}_${sizeBytes}_hash`
}

/**
 * Validate that a Physical Passover event is well-formed
 */
export function validatePassoverEvent(event: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!event || typeof event !== 'object') {
    errors.push('Event must be an object')
    return { valid: false, errors }
  }

  const evt = event as Record<string, unknown>

  if (!evt.stage || typeof evt.stage !== 'string') {
    errors.push('Missing or invalid stage field')
  }

  if (!evt.timestamp || typeof evt.timestamp !== 'number') {
    errors.push('Missing or invalid timestamp field')
  }

  // Stage-specific validation
  if (evt.stage === PassoverStage.CODEC && !evt.fileHash) {
    errors.push('CODEC stage requires fileHash')
  }

  if (evt.stage === PassoverStage.DECODE && (!evt.tensorHash || !evt.preprocessingRecipeId)) {
    errors.push('DECODE stage requires tensorHash and preprocessingRecipeId')
  }

  if (
    evt.stage === PassoverStage.VISION_TOKENIZATION &&
    (typeof evt.patchCount !== 'number' || typeof evt.embeddingDim !== 'number')
  ) {
    errors.push('VISION_TOKENIZATION stage requires patchCount and embeddingDim')
  }

  if (evt.stage === PassoverStage.TEXT_TOKENIZATION && typeof evt.tokenCount !== 'number') {
    errors.push('TEXT_TOKENIZATION stage requires tokenCount')
  }

  if (
    evt.stage === PassoverStage.MULTIMODAL_FUSION &&
    (typeof evt.contextLength !== 'number' ||
      typeof evt.visionTokenCount !== 'number' ||
      typeof evt.textTokenCount !== 'number')
  ) {
    errors.push(
      'MULTIMODAL_FUSION stage requires contextLength, visionTokenCount, and textTokenCount',
    )
  }

  if (evt.stage === PassoverStage.TOKEN_GENERATION && typeof evt.generatedTokenCount !== 'number') {
    errors.push('TOKEN_GENERATION stage requires generatedTokenCount')
  }

  if (
    evt.stage === PassoverStage.TEXT_RENDERING &&
    (typeof evt.outputText !== 'string' || typeof evt.characterCount !== 'number')
  ) {
    errors.push('TEXT_RENDERING stage requires outputText and characterCount')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create a minimal trace record for a new Physical Passover pipeline execution
 */
export function createTrace(params: {
  traceId: string
  inputHash?: string
  promptHash?: string
  modelId?: string
  modelVersion?: string
}): {
  traceId: string
  startTime: number
  inputHash?: string
  promptHash?: string
  modelId?: string
  modelVersion?: string
} {
  return {
    traceId: params.traceId,
    startTime: Date.now(),
    inputHash: params.inputHash,
    promptHash: params.promptHash,
    modelId: params.modelId,
    modelVersion: params.modelVersion,
  }
}

/**
 * Type guard to check if an event is from a specific stage
 */
export function isStageEvent<T extends PassoverStageType>(
  event: unknown,
  stage: T,
): event is Extract<ReturnType<typeof PhysicalPassoverEventSchema>, { stage: T }> {
  return (
    typeof event === 'object' &&
    event !== null &&
    'stage' in event &&
    (event as { stage: unknown }).stage === stage
  )
}
