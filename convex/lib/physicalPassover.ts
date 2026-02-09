/**
 * Physical Passover Domain
 *
 * Tracks the 11-stage multimodal AI pipeline from physical photons to semantic tokens.
 * This domain captures the transformation journey through:
 * 1. photon_capture - Physical light capture
 * 2. sensor_read - Sensor data reading
 * 3. pixel_array - Pixel array formation
 * 4. image_decode - Image decoding
 * 5. ocr_preprocess - OCR preprocessing
 * 6. text_detection - Text detection
 * 7. text_recognition - Text recognition
 * 8. text_postprocess - Text postprocessing
 * 9. token_generation - Token generation
 * 10. embedding_creation - Embedding creation
 * 11. semantic_parse - Semantic parsing
 */

export type PhysicalPassoverStage =
  | 'photon_capture'
  | 'sensor_read'
  | 'pixel_array'
  | 'image_decode'
  | 'ocr_preprocess'
  | 'text_detection'
  | 'text_recognition'
  | 'text_postprocess'
  | 'token_generation'
  | 'embedding_creation'
  | 'semantic_parse'

export const PHYSICAL_PASSOVER_STAGES: PhysicalPassoverStage[] = [
  'photon_capture',
  'sensor_read',
  'pixel_array',
  'image_decode',
  'ocr_preprocess',
  'text_detection',
  'text_recognition',
  'text_postprocess',
  'token_generation',
  'embedding_creation',
  'semantic_parse',
]

export type PhysicalPassoverStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type PhysicalPassoverEvent = {
  traceId: string
  stage: PhysicalPassoverStage
  stageIndex: number
  timestamp: number
  durationMs?: number
  metadata?: Record<string, unknown>
}

export type PhysicalPassoverTrace = {
  traceId: string
  userId?: string
  source: string
  startedAt: number
  completedAt?: number
  totalStages: number
  completedStages: number
  status: PhysicalPassoverStatus
  result?: Record<string, unknown>
  errorMessage?: string
}

/**
 * Generate a unique trace ID for a Physical Passover session
 */
export function generateTraceId(): string {
  return `pp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get the stage index for a given stage name
 */
export function getStageIndex(stage: PhysicalPassoverStage): number {
  return PHYSICAL_PASSOVER_STAGES.indexOf(stage)
}

/**
 * Check if all stages are completed
 */
export function isTraceComplete(trace: PhysicalPassoverTrace): boolean {
  return trace.completedStages >= trace.totalStages && trace.status === 'completed'
}

/**
 * Calculate total duration from events
 */
export function calculateTraceDuration(
  events: Array<Pick<PhysicalPassoverEvent, 'durationMs'>>,
): number {
  return events.reduce((sum, event) => sum + (event.durationMs || 0), 0)
}

/**
 * Validate stage progression (stages must be processed in order)
 */
export function validateStageProgression(
  currentStage: PhysicalPassoverStage,
  lastCompletedStage?: PhysicalPassoverStage,
): boolean {
  if (!lastCompletedStage) {
    return currentStage === PHYSICAL_PASSOVER_STAGES[0]
  }

  const currentIndex = getStageIndex(currentStage)
  const lastIndex = getStageIndex(lastCompletedStage)

  return currentIndex === lastIndex + 1
}

/**
 * Get next expected stage
 */
export function getNextStage(currentStage: PhysicalPassoverStage): PhysicalPassoverStage | null {
  const currentIndex = getStageIndex(currentStage)
  if (currentIndex < PHYSICAL_PASSOVER_STAGES.length - 1) {
    return PHYSICAL_PASSOVER_STAGES[currentIndex + 1]
  }
  return null
}

/**
 * Build a summary of trace progress
 */
export function buildTraceSummary(
  trace: PhysicalPassoverTrace,
  events: PhysicalPassoverEvent[],
): {
  traceId: string
  status: PhysicalPassoverStatus
  progress: number
  totalDuration: number
  currentStage?: PhysicalPassoverStage
  errorMessage?: string
} {
  const sortedEvents = events.sort((a, b) => a.stageIndex - b.stageIndex)
  const lastEvent = sortedEvents[sortedEvents.length - 1]

  return {
    traceId: trace.traceId,
    status: trace.status,
    progress: trace.totalStages > 0 ? trace.completedStages / trace.totalStages : 0,
    totalDuration: calculateTraceDuration(events),
    currentStage: lastEvent?.stage,
    errorMessage: trace.errorMessage,
  }
}
