# Live OpenClaw Dashboard

The Live Dashboard is a real-time monitoring interface for OpenClaw agents. It streams events from agents and visualizes their hypothesis generation and problem-solving process.

## Features

### 1. Real-time Event Streaming

The dashboard uses a polling mechanism to continuously fetch new events from the backend:

- **Polling interval**: 2 seconds (configurable)
- **Incremental loading**: Only fetches events since the last known timestamp
- **Auto-reconnect**: Handles network errors and automatically reconnects
- **No manual refresh required**: Panel stays open and updates automatically

### 2. Session Monitoring

Each OpenClaw agent runs in a session identified by a `sessionKey`. The dashboard displays:

- Session key (e.g., `agent:crawfather:main`)
- Agent name (extracted from session key)
- Total event count
- Last event timestamp

### 3. Hypothesis Visualization

Hypotheses are derived from events and displayed with:

- **Status indicators**:
  - 🟢 Active: Currently being investigated
  - 🟡 Stale: Lower confidence, may be abandoned
  - ✅ Resolved: Confirmed or disproven
- **Confidence scores**: 0-100% probability
- **Update count**: How many times the hypothesis has been refined
- **Timeline**: Creation and last update timestamps

### 4. Event Timeline

Recent events are displayed in chronological order showing:

- Timestamp
- Event type
- Event message/hypothesis text
- Color-coded by type (hypothesis, task, error, info)

## Usage

### Basic Access

Navigate to `/live` in your browser:

```
https://clawhub.ai/live
```

### Custom Session Key

Monitor a specific session using the `sessionKey` query parameter:

```
https://clawhub.ai/live?sessionKey=agent:myagent:main
```

### Session Key Format

Session keys follow the pattern:

```
agent:{agent_name}:{branch}
```

Examples:
- `agent:crawfather:main` - Main branch of crawfather agent
- `agent:debugger:feature-x` - Feature branch of debugger agent
- `agent:researcher:experiment-1` - Experimental session

## API Integration

### Fetching Events

The dashboard polls this endpoint:

```
GET /api/v1/openclaw/events?sessionKey={key}&since={timestamp}&limit={count}
```

Query parameters:
- `sessionKey` (required): Session identifier
- `since` (optional): Only return events after this timestamp (Unix milliseconds)
- `limit` (optional): Maximum number of events to return (default: 100)

Response:

```json
{
  "sessionInfo": {
    "sessionKey": "agent:crawfather:main",
    "agentName": "crawfather",
    "eventCount": 42,
    "lastEventAt": "2024-02-09T12:34:56.789Z"
  },
  "events": [
    {
      "id": "abc123",
      "sessionKey": "agent:crawfather:main",
      "type": "hypothesis_created",
      "timestamp": "2024-02-09T12:30:00.000Z",
      "payload": {
        "hypothesisId": "hyp-001",
        "hypothesis": "The bug is in the authentication layer",
        "score": 0.75,
        "status": "active"
      }
    }
  ]
}
```

### Submitting Events

Agents can submit events via:

```
POST /api/v1/openclaw/events
```

Request body:

```json
{
  "sessionKey": "agent:crawfather:main",
  "type": "hypothesis_created",
  "timestamp": "2024-02-09T12:30:00.000Z",
  "payload": {
    "hypothesisId": "hyp-001",
    "hypothesis": "The bug is in the authentication layer",
    "score": 0.75,
    "status": "active"
  }
}
```

## Event Types

### hypothesis_created

A new hypothesis has been generated.

Required payload fields:
- `hypothesisId`: Unique identifier for this hypothesis
- `hypothesis`: Text description
- `score`: Confidence score (0.0-1.0)
- `status`: "active" | "stale" | "resolved"

### hypothesis_updated

An existing hypothesis has been updated.

Required payload fields:
- `hypothesisId`: Identifier of the hypothesis being updated
- `score` (optional): Updated confidence score
- `status` (optional): Updated status
- `hypothesis` (optional): Updated text

### hypothesis_resolved

A hypothesis has been confirmed or disproven.

Required payload fields:
- `hypothesisId`: Identifier of the resolved hypothesis
- `status`: "resolved"

### task_completed

The agent completed a specific task.

Required payload fields:
- `message`: Description of the completed task

### error

An error occurred during agent execution.

Required payload fields:
- `error`: Error message

### info

General informational message.

Required payload fields:
- `message`: Informational text

## Configuration

### Environment Variables

- `VITE_CONVEX_URL`: Convex deployment URL (required for API access)
- No additional configuration needed for the live dashboard

### Customizing Poll Interval

Edit `src/routes/live.tsx`:

```typescript
const { events, sessionInfo, isLoading, error } = useEventStream({
  sessionKey,
  pollInterval: 5000, // Change to 5 seconds
})
```

### Changing Default Session Key

Edit `src/routes/live.tsx`:

```typescript
validateSearch: (search: Record<string, unknown>) => {
  return {
    sessionKey: (search.sessionKey as string) || 'agent:myagent:main', // Change default
  }
}
```

## Testing

### Seeding Sample Events

Use the Convex CLI to create sample events:

```bash
# Seed default session
bunx convex run openclawEventsSeed:seedSampleEvents

# Seed custom session
bunx convex run openclawEventsSeed:seedSampleEvents --sessionKey "agent:test:dev"
```

This creates realistic sample data including:
- Multiple hypotheses at different stages
- Updates showing hypothesis refinement
- Resolved and stale hypotheses
- Task completion and info events

### Manual Event Creation

You can also create events manually via the API:

```bash
curl -X POST https://your-convex-site.convex.site/api/v1/openclaw/events \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:test:dev",
    "type": "hypothesis_created",
    "timestamp": "2024-02-09T12:00:00.000Z",
    "payload": {
      "hypothesisId": "hyp-test-1",
      "hypothesis": "Test hypothesis",
      "score": 0.5,
      "status": "active"
    }
  }'
```

## Architecture

### Frontend Components

- **`/src/routes/live.tsx`**: Main dashboard page component
- **`/src/lib/useEventStream.ts`**: React hook for polling events
- **`/src/lib/hypothesisReducer.ts`**: Logic for deriving hypotheses from events
- **`/src/lib/openclaw-types.ts`**: TypeScript type definitions

### Backend Components

- **`convex/openclawEvents.ts`**: Convex queries and mutations for events
- **`convex/openclawEventsHttp.ts`**: HTTP API handlers
- **`convex/schema.ts`**: Database schema for `openclawEvents` table
- **`convex/http.ts`**: HTTP route configuration

### Data Flow

1. Agent emits event → POST `/api/v1/openclaw/events`
2. Event stored in Convex `openclawEvents` table
3. Dashboard polls GET `/api/v1/openclaw/events?sessionKey=...&since=...`
4. New events returned and merged into UI state
5. `hypothesisReducer` processes events into hypothesis summaries
6. UI updates to show latest state

## Troubleshooting

### No events showing

1. Check that you're monitoring the correct `sessionKey`
2. Verify events exist: `bunx convex run openclawEvents:listBySession --sessionKey "agent:crawfather:main"`
3. Seed sample data: `bunx convex run openclawEventsSeed:seedSampleEvents`

### Dashboard not updating

1. Check browser console for network errors
2. Verify `/api/v1/openclaw/events` endpoint is accessible
3. Check that polling is enabled (not disabled by error state)

### Events showing but hypotheses not updating

1. Verify events have correct `hypothesisId` in payload
2. Check event types are spelled correctly (`hypothesis_created`, not `hypothesisCreated`)
3. Ensure hypothesis events include required fields (`hypothesis`, `score`, `status`)

## Future Enhancements

Potential improvements for the live dashboard:

- **WebSocket support**: Replace polling with WebSocket/SSE for true push-based updates
- **Historical playback**: Replay past sessions to understand agent behavior
- **Multi-session view**: Monitor multiple agents simultaneously
- **Performance metrics**: Track hypothesis generation rate, resolution time, etc.
- **Export/sharing**: Save and share interesting sessions
- **Filters**: Filter events by type, hypothesis status, etc.
- **Search**: Search event messages and hypothesis text
