# Physical Passover Domain

The Physical Passover Domain tracks the 11-stage multimodal AI pipeline that transforms physical photons into semantic text tokens.

## Overview

Physical Passover captures the complete transformation journey from light capture to semantic understanding:

1. **Photon Capture** - Physical light entering the system
2. **Sensor Read** - Converting photons to electrical signals
3. **Pixel Array** - Forming a 2D pixel array
4. **Image Decode** - Decoding compressed image formats
5. **OCR Preprocess** - Preparing image for OCR
6. **Text Detection** - Locating text regions
7. **Text Recognition** - Converting pixels to characters
8. **Text Postprocess** - Cleaning and normalizing text
9. **Token Generation** - Generating linguistic tokens
10. **Embedding Creation** - Creating semantic embeddings
11. **Semantic Parse** - Parsing semantic structure

## Architecture

### Schema

**physicalPassoverTraces**
- Tracks overall pipeline execution
- Contains trace ID, user, source, status, timing
- Indexed by trace ID, user, and status

**physicalPassoverEvents**
- Records individual stage completions
- Contains stage name, duration, metadata
- Indexed by trace ID, stage, and timestamp

### Key Functions

#### Creating a Trace

```typescript
import { api } from '../convex/_generated/api'

const { traceId } = await convex.mutation(api.physicalPassoverEvents.createTrace, {
  source: 'camera-app',
  userId: currentUserId, // optional
})
```

#### Recording Stage Events

```typescript
await convex.mutation(api.physicalPassoverEvents.recordEvent, {
  traceId,
  stage: 'photon_capture',
  durationMs: 45,
  metadata: {
    resolution: '1920x1080',
    format: 'jpeg',
  },
})
```

Stages must be recorded in order. The system validates progression automatically.

#### Handling Failures

```typescript
await convex.mutation(api.physicalPassoverEvents.failTrace, {
  traceId,
  errorMessage: 'OCR preprocessing failed: insufficient contrast',
})
```

### Querying Data

#### Get Trace Details

```typescript
const data = await convex.query(api.physicalPassoverEvents.getTrace, {
  traceId,
})

// Returns: { trace, events, summary }
```

#### List User Traces

```typescript
const traces = await convex.query(api.physicalPassoverEvents.listUserTraces, {
  userId,
  limit: 20,
})
```

#### Get Analytics

```typescript
const stats = await convex.query(api.physicalPassoverEvents.getStats, {
  startTime: Date.now() - 24 * 60 * 60 * 1000,
  endTime: Date.now(),
})

// Returns: { total, completed, failed, processing, pending, avgDurationMs }
```

## Usage Examples

### Complete Pipeline Example

```typescript
// 1. Create trace
const { traceId } = await createTrace({ source: 'mobile-app' })

try {
  // 2. Record each stage
  for (const stage of PHYSICAL_PASSOVER_STAGES) {
    const startTime = Date.now()
    
    // Perform stage processing...
    await processStage(stage)
    
    const durationMs = Date.now() - startTime
    
    await recordEvent({
      traceId,
      stage,
      durationMs,
      metadata: getStageMetadata(stage),
    })
  }
} catch (error) {
  // 3. Handle failure
  await failTrace({
    traceId,
    errorMessage: error.message,
  })
}
```

### Analytics Dashboard

```typescript
// Get recent activity
const recentTraces = await listRecentTraces({ 
  limit: 100,
  status: 'completed' 
})

// Get aggregate stats
const stats = await getStats({
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
})

console.log(`Success rate: ${(stats.completed / stats.total * 100).toFixed(1)}%`)
console.log(`Avg duration: ${(stats.avgDurationMs / 1000).toFixed(2)}s`)
```

## Performance Considerations

### Indexing

- Traces are indexed by user and status for efficient filtering
- Events are indexed by timestamp for time-range queries
- Use `.gte()` and `.lte()` for optimal index usage

### Maintenance

Old events can be cleaned up using the internal maintenance mutation:

```typescript
await ctx.scheduler.runAfter(0, internal.physicalPassoverEvents.deleteOldEvents, {
  beforeTimestamp: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
  batchSize: 100,
})
```

### Query Optimization

For time-range queries, always use indexed fields:

```typescript
// Good - uses index
const events = await ctx.db
  .query('physicalPassoverEvents')
  .withIndex('by_timestamp', (q) =>
    q.gte('timestamp', startTime).lte('timestamp', endTime)
  )
  .take(limit)

// Bad - scans all records
const allEvents = await ctx.db.query('physicalPassoverEvents').collect()
const filtered = allEvents.filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
```

## Integration with Skills

Physical Passover can be integrated with skill tracking:

```typescript
// Associate a passover trace with skill usage
await recordEvent({
  traceId,
  stage: 'semantic_parse',
  metadata: {
    skillSlug: 'ocr-processor',
    skillVersion: '1.2.0',
  },
})
```

## Error Handling

The system validates:
- Trace existence
- Stage progression order
- Required fields

Always wrap mutations in try-catch blocks and handle failures gracefully.

## Future Enhancements

Potential additions:
- Stage-level retry mechanisms
- Branching pipelines (parallel paths)
- Quality metrics per stage
- Real-time progress webhooks
- Integration with telemetry system
