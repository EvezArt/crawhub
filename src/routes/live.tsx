import { createFileRoute } from '@tanstack/react-router'
import { Activity, AlertCircle, CheckCircle, Clock, Loader2, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { getHypothesesArray, reduceEventsToHypotheses } from '../lib/hypothesisReducer'
import type { AgentEvent, HypothesisSummary } from '../lib/openclaw-types'
import { useEventStream } from '../lib/useEventStream'

export const Route = createFileRoute('/live')({
  component: LiveDashboard,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      sessionKey: (search.sessionKey as string) || 'agent:crawfather:main',
    }
  },
})

function LiveDashboard() {
  const { sessionKey } = Route.useSearch()
  const { events, sessionInfo, isLoading, error } = useEventStream({ sessionKey })

  // Derive hypotheses from events
  const hypotheses = useMemo(() => {
    const hypothesesMap = reduceEventsToHypotheses(events)
    return getHypothesesArray(hypothesesMap)
  }, [events])

  if (error) {
    return (
      <main className="section">
        <div
          className="card"
          style={{ backgroundColor: 'var(--color-error-bg)', borderColor: 'var(--color-error)' }}
        >
          <AlertCircle className="h-5 w-5" style={{ color: 'var(--color-error)' }} />
          <p style={{ color: 'var(--color-error)' }}>Error: {error.message}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="section">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="section-title" style={{ margin: 0 }}>
            <Radio className="h-6 w-6" style={{ display: 'inline', marginRight: '8px' }} />
            Live OpenClaw Dashboard
          </h1>
          {isLoading && events.length === 0 ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span
              className="tag"
              style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}
            >
              <Activity className="h-3 w-3" />
              Live
            </span>
          )}
        </div>

        {/* Session Info Card */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Session Info</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Session Key
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{sessionKey}</div>
            </div>
            {sessionInfo?.agentName && (
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  Agent Name
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{sessionInfo.agentName}</div>
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Total Events
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {sessionInfo?.eventCount ?? 0}
              </div>
            </div>
            {sessionInfo?.lastEventAt && (
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  Last Event
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {new Date(sessionInfo.lastEventAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hypotheses Card */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
            Hypotheses ({hypotheses.length})
          </h2>
          {hypotheses.length === 0 ? (
            <p
              style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px' }}
            >
              No hypotheses yet. Waiting for events...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hypotheses.map((hypothesis) => (
                <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Events Card */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
            Recent Events ({events.length})
          </h2>
          {events.length === 0 ? (
            <p
              style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px' }}
            >
              No events yet. Waiting for data...
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              {events
                .slice(-20)
                .reverse()
                .map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function HypothesisCard({ hypothesis }: { hypothesis: HypothesisSummary }) {
  const statusConfig = {
    active: {
      icon: Activity,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-bg)',
      label: 'Active',
    },
    stale: {
      icon: Clock,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      label: 'Stale',
    },
    resolved: {
      icon: CheckCircle,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      label: 'Resolved',
    },
  }

  const config = statusConfig[hypothesis.status]
  const Icon = config.icon

  return (
    <div
      className="card"
      style={{
        padding: '16px',
        borderLeft: `3px solid ${config.color}`,
        backgroundColor: config.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Icon
          className="h-5 w-5"
          style={{ color: config.color, flexShrink: 0, marginTop: '2px' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="tag" style={{ backgroundColor: config.bg, color: config.color }}>
              {config.label}
            </span>
            <span
              className="tag"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              Score: {(hypothesis.score * 100).toFixed(0)}%
            </span>
            {hypothesis.updateCount > 0 && (
              <span className="tag" style={{ fontSize: '11px' }}>
                {hypothesis.updateCount} update{hypothesis.updateCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>{hypothesis.text}</p>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Created {new Date(hypothesis.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

function EventRow({ event }: { event: AgentEvent }) {
  const eventTypeColors: Record<string, string> = {
    hypothesis_created: 'var(--color-primary)',
    hypothesis_updated: 'var(--color-info)',
    hypothesis_resolved: 'var(--color-success)',
    task_completed: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-text-secondary)',
  }

  const color = eventTypeColors[event.type] || 'var(--color-text-secondary)'

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'var(--color-bg-secondary)',
        fontSize: '13px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
          minWidth: '80px',
        }}
      >
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
      <div
        style={{
          fontWeight: 600,
          color,
          minWidth: '140px',
        }}
      >
        {event.type}
      </div>
      <div style={{ flex: 1, color: 'var(--color-text)' }}>
        {event.payload.hypothesis || event.payload.message || event.payload.error || '—'}
      </div>
    </div>
  )
}
