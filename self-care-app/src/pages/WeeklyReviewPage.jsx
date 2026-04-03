import { useState, useMemo } from 'react'
import {
  getWeekRange,
  getWeekCheckins,
  getWeekLogs,
  getWeekHabitStats,
  getWeekInteractions,
  getPeople,
} from '../utils/storage'

const pillarMeta = [
  { key: 'learn', label: 'Learning', color: 'var(--color-learn)', icon: '\u{1F4DA}' },
  { key: 'connect', label: 'Connections', color: 'var(--color-connect)', icon: '\u{1F49C}' },
  { key: 'nutrition', label: 'Eating Well', color: 'var(--color-nutrition)', icon: '\u{1F957}' },
  { key: 'body', label: 'Body Care', color: 'var(--color-body)', icon: '\u{26A1}' },
]

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeeklyReviewPage() {
  const [weekOffset, setWeekOffset] = useState(0)

  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset])
  const checkins = useMemo(() => getWeekCheckins(week.dates), [week])
  const habitStats = useMemo(() => getWeekHabitStats(week.dates), [week])
  const interactions = useMemo(() => getWeekInteractions(week.dates), [week])
  const people = useMemo(() => getPeople(), [])

  const allLogs = useMemo(() => getWeekLogs(week.dates), [week])

  // Compute per-pillar averages from check-ins
  const pillarAverages = useMemo(() => {
    const avgs = {}
    for (const p of pillarMeta) {
      const ratings = checkins.map((c) => c.ratings?.[p.key]).filter((r) => r > 0)
      avgs[p.key] = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0
    }
    return avgs
  }, [checkins])

  // Daily mood from check-ins
  const dailyMoods = useMemo(() => {
    const moods = {}
    for (const c of checkins) moods[c.date] = c.overallMood || 0
    return moods
  }, [checkins])

  // Best day
  const bestDay = useMemo(() => {
    let best = null
    let bestScore = 0
    for (const c of checkins) {
      const score = Object.values(c.ratings || {}).reduce((a, b) => a + b, 0)
      if (score > bestScore) { bestScore = score; best = c.date }
    }
    return best
  }, [checkins])

  // Focus area: lowest-scoring pillar
  const focusArea = useMemo(() => {
    let lowest = null
    let lowestAvg = Infinity
    for (const p of pillarMeta) {
      const avg = pillarAverages[p.key]
      if (avg > 0 && avg < lowestAvg) { lowestAvg = avg; lowest = p }
    }
    return lowest
  }, [pillarAverages])

  const isThisWeek = weekOffset === 0

  return (
    <div className="px-5 pt-6 pb-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-[var(--color-text)] m-0">
            {isThisWeek ? 'This Week' : 'Weekly Review'}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
            {formatDateShort(week.start)} — {formatDateShort(week.end)}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={isThisWeek}
          className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer disabled:opacity-30"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Mood sparkline */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">Daily Mood</h2>
        <div className="flex justify-between items-end gap-1 h-20">
          {week.dates.map((date, i) => {
            const mood = dailyMoods[date] || 0
            const height = mood > 0 ? (mood / 5) * 100 : 0
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '60px' }}>
                  <div
                    className="w-full max-w-[28px] rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(height, mood > 0 ? 15 : 4)}%`,
                      backgroundColor: mood > 0 ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                      opacity: mood > 0 ? 0.6 + mood * 0.08 : 0.3,
                    }}
                  />
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)]">{dayLabels[i]}</span>
              </div>
            )
          })}
        </div>
        {checkins.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center mt-2 m-0 opacity-60">
            No check-ins this week
          </p>
        )}
      </div>

      {/* Pillar scores */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">Pillar Averages</h2>
        <div className="flex flex-col gap-3">
          {pillarMeta.map((p) => {
            const avg = pillarAverages[p.key]
            const pct = avg > 0 ? (avg / 5) * 100 : 0
            return (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {p.icon} {p.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: avg > 0 ? p.color : 'var(--color-text-muted)' }}>
                    {avg > 0 ? avg.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Habit completion */}
      {habitStats.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">Habit Completion</h2>
          <div className="flex flex-col gap-2">
            {habitStats.map((h) => {
              const pillar = pillarMeta.find((p) => p.key === h.pillar)
              const pct = h.goal > 0 ? Math.min((h.completed / h.goal) * 100, 100) : 0
              const metGoal = h.completed >= h.goal
              return (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-[var(--color-text)] truncate">{h.name}</span>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: metGoal ? '#22c55e' : 'var(--color-text-muted)' }}>
                        {h.completed}/{h.goal} {metGoal ? '\u2713' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pillar?.color || 'var(--color-primary)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity summary */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">Activity Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          {pillarMeta.map((p) => {
            const logs = allLogs.filter((l) => l.pillar === p.key)
            const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0)
            return (
              <div key={p.key} className="p-3 rounded-xl" style={{ backgroundColor: `${p.color}10` }}>
                <span className="text-lg">{p.icon}</span>
                <p className="text-lg font-bold m-0 mt-1" style={{ color: p.color }}>
                  {logs.length}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                  {logs.length === 1 ? 'entry' : 'entries'}
                  {totalMinutes > 0 && ` \u2022 ${totalMinutes}m`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Connections summary */}
      {interactions.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">
            {'\u{1F49C}'} Connections This Week
          </h2>
          <p className="text-2xl font-bold text-[var(--color-connect)] m-0">{interactions.length}</p>
          <p className="text-xs text-[var(--color-text-muted)] m-0">
            interactions with {new Set(interactions.map((i) => i.personId)).size} {new Set(interactions.map((i) => i.personId)).size === 1 ? 'person' : 'people'}
          </p>
        </div>
      )}

      {/* Highlights */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] m-0 mb-3">Highlights</h2>
        <div className="flex flex-col gap-2">
          {bestDay && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u{1F31F}'}</span>
              <span className="text-xs text-[var(--color-text)]">
                Best day: <strong>{formatDayName(bestDay)}</strong>
              </span>
            </div>
          )}
          {focusArea && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u{1F3AF}'}</span>
              <span className="text-xs text-[var(--color-text)]">
                Focus area: <strong>{focusArea.label}</strong>
                <span className="text-[var(--color-text-muted)]"> (avg {pillarAverages[focusArea.key].toFixed(1)}/5)</span>
              </span>
            </div>
          )}
          {checkins.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u{1F4DD}'}</span>
              <span className="text-xs text-[var(--color-text)]">
                Checked in <strong>{checkins.length}/7</strong> days
              </span>
            </div>
          )}
          {checkins.length === 0 && allLogs.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] opacity-60 m-0">
              No data for this week yet. Start checking in!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}
