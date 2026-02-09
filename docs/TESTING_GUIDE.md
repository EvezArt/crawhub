# Live Dashboard Testing Guide

## Quick Start

This guide walks through testing the live OpenClaw dashboard functionality.

## Prerequisites

1. **Bun installed**: Ensure you have Bun runtime installed
   ```bash
   bun --version
   ```

2. **Dependencies installed**:
   ```bash
   bun install
   ```

3. **Convex setup**: You need a Convex deployment configured
   ```bash
   # Check .env.local for VITE_CONVEX_URL
   cat .env.local.example
   ```

## Testing Steps

### Step 1: Verify Build

Ensure the application builds successfully:

```bash
bun run build
```

Expected: Build completes without errors.

### Step 2: Run Tests

Run the hypothesis reducer unit tests:

```bash
bun run test src/lib/hypothesisReducer.test.ts
```

Expected: All 8 tests pass.

### Step 3: Seed Sample Events

This is the key test from the problem statement. Run the seed function:

```bash
bunx convex run openclawEventsSeed:seedSampleEvents
```

**What this does:**
- Clears any existing events for `agent:crawfather:main`
- Creates 10 sample events including:
  - 4 hypotheses (2 active, 1 stale, 1 resolved)
  - Task completion events
  - Info messages
  - Timestamps spread over 5 minutes in the past

**Expected output:**
```json
{
  "message": "Seeded 10 sample events for session: agent:crawfather:main",
  "eventCount": 10
}
```

**Alternative**: Seed for a different session:
```bash
bunx convex run openclawEventsSeed:seedSampleEvents --sessionKey "agent:test:dev"
```

### Step 4: Start Development Server

Start the local dev server:

```bash
bun run dev
```

This will start the server at `http://localhost:3000`

**Note**: You also need to run Convex dev in a separate terminal:
```bash
bunx convex dev
```

### Step 5: Access the Live Dashboard

Open your browser and navigate to:

```
http://localhost:3000/live?sessionKey=agent:crawfather:main
```

**What you should see:**

1. **Header Section**:
   - Title: "🔴 Live OpenClaw Dashboard"
   - Green "Live" indicator (pulsing)

2. **Session Info Card**:
   - Session Key: `agent:crawfather:main`
   - Agent Name: `crawfather`
   - Total Events: `10`
   - Last Event: Recent timestamp

3. **Hypotheses Card** (4 total):
   - **Active Hypothesis** (🟢):
     - "Memory leak in event handler causing performance degradation"
     - Score: 80%
     - 0 updates
   
   - **Active Hypothesis** (🟢):
     - "The authentication issue is caused by expired JWT tokens"
     - Score: 85%
     - 1 update
   
   - **Stale Hypothesis** (🟡):
     - "Rate limiting is preventing API calls from completing"
     - Score: 40%
     - 1 update
   
   - **Resolved Hypothesis** (✅):
     - "Database connection pool is exhausted during peak hours"
     - Score: 85%

4. **Recent Events Timeline**:
   - Shows last 10 events in reverse chronological order
   - Color-coded by type:
     - `info` - gray
     - `hypothesis_created` - blue
     - `hypothesis_updated` - cyan
     - `hypothesis_resolved` - green
     - `task_completed` - green

### Step 6: Test Real-Time Updates

The dashboard polls every 2 seconds. To test this:

1. Keep the dashboard open at `/live?sessionKey=agent:crawfather:main`

2. In another terminal, post a new event via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/openclaw/events \
     -H "Content-Type: application/json" \
     -d '{
       "sessionKey": "agent:crawfather:main",
       "type": "hypothesis_created",
       "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
       "payload": {
         "hypothesisId": "hyp-new-1",
         "hypothesis": "New test hypothesis",
         "score": 0.9,
         "status": "active"
       }
     }'
   ```

3. Within 2 seconds, you should see:
   - Event count increase by 1
   - New hypothesis appear in the "Hypotheses" section
   - New event appear in "Recent Events"

### Step 7: Test Different Sessions

Navigate to a different session:

```
http://localhost:3000/live?sessionKey=agent:test:dev
```

**Expected:**
- Shows "No events yet" (unless you seeded this session)
- Session Key displays as `agent:test:dev`
- Agent Name displays as `test`

Seed this session:
```bash
bunx convex run openclawEventsSeed:seedSampleEvents --sessionKey "agent:test:dev"
```

Refresh the page - events should now appear.

## API Testing

### Get Events

Test the GET endpoint:

```bash
curl "http://localhost:3000/api/v1/openclaw/events?sessionKey=agent:crawfather:main&limit=5"
```

Expected response structure:
```json
{
  "sessionInfo": {
    "sessionKey": "agent:crawfather:main",
    "agentName": "crawfather",
    "eventCount": 10,
    "lastEventAt": "2024-02-09T12:35:23.000Z"
  },
  "events": [
    {
      "id": "...",
      "sessionKey": "agent:crawfather:main",
      "type": "info",
      "timestamp": "2024-02-09T12:30:00.000Z",
      "payload": {
        "message": "Agent session started"
      }
    },
    // ... more events
  ]
}
```

### Post Event

Test creating a new event:

```bash
curl -X POST http://localhost:3000/api/v1/openclaw/events \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:crawfather:main",
    "type": "info",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "payload": {
      "message": "Test event from curl"
    }
  }'
```

Expected response:
```json
{
  "id": "j123456789abcdef"
}
```

## Troubleshooting

### "Cannot find module" errors

Run `bun install` to ensure all dependencies are installed.

### Convex authentication errors

Make sure you have:
1. Set up `.env.local` with `VITE_CONVEX_URL`
2. Run `bunx convex dev` in a separate terminal
3. Logged in with `bunx convex login`

### Dashboard shows "No events"

1. Verify events were seeded: `bunx convex run openclawEvents:listBySession --sessionKey "agent:crawfather:main"`
2. Check the correct sessionKey in the URL
3. Check browser console for errors

### Events not updating in real-time

1. Check browser console for network errors
2. Verify the API endpoint is accessible: `curl http://localhost:3000/api/v1/openclaw/events?sessionKey=agent:crawfather:main`
3. Check that Convex dev is running

## Success Criteria

✅ **Build**: `bun run build` completes successfully  
✅ **Tests**: All hypothesis reducer tests pass  
✅ **Seed**: Sample events created via `seedSampleEvents`  
✅ **Dashboard**: `/live` route renders without errors  
✅ **Session Info**: Displays correct event count and agent name  
✅ **Hypotheses**: Shows 4 hypotheses (2 active, 1 stale, 1 resolved)  
✅ **Events**: Timeline shows 10 events  
✅ **Polling**: New events appear within 2 seconds  
✅ **API**: GET and POST endpoints respond correctly  

## Next Steps

Once testing is complete:

1. Run full test suite: `bun run test`
2. Run linter: `bun run lint`
3. Build for production: `bun run build`
4. Deploy to staging/production

## Additional Resources

- **Full Documentation**: See `docs/live-dashboard.md`
- **API Reference**: See README.md section "Live OpenClaw Dashboard"
- **Architecture**: See implementation summary in docs
