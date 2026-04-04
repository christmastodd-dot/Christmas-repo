import { useMemo } from 'react'
import {
  loadData,
  getHabitsForPillar,
  getCompletionsForDate,
  getLogsForPillar,
} from '../utils/storage'

export default function PillarInsights({ pillar, color }) {
  const { heatmapData, weeklyTrend, bestStreak, currentStreak, totalLogs } = useMemo(
    () => computeInsights(pillar),
    [pillar]
  )

  if (totalLogs === 0 && bestStreak === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide m-0 mb-3">
        Insights
      </h2>

      {/* Stats row */}
      <div className="flex gap-2 mb-3">
        {bestStreak > 0 && (
          <StatBadge
            icon={'\u{1F3C6}'}
            value={`${bestStreak}d`}
            label="Best streak"
            color={color}
            highlight={currentStreak >= bestStreak && currentStreak > 0}
          />
        )}
        {currentStreak > 0 && (
          <StatBadge
            icon={'\u{1F525}'}
            value={`${currentStreak}d`}
            label="Current"
            color={color}
          />
        )}
        {totalLogs > 0 && (
          <StatBadge
            icon={'\u{1F4DD}'}
            value={totalLogs}
            label="Entries"
            color={color}
          />
        )}
      </div>

      {/* Sparkline trend */}
      {weeklyTrend.length > 1 && (
        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">4-Week Trend</span>
            <TrendIndicator trend={weeklyTrend} color={color} />
          </div>
          <Sparkline data={weeklyTrend} color={color} />
        </div>
      )}

      {/* 30-day heatmap */}
      <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Last 30 Days</span>
        <div className="flex flex-wrap gap-[3px] mt-2">
          {heatmapData.map((day, i) => (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-sm"
              style={{
                backgroundColor: day.level === 0
                  ? 'var(--color-surface-hover)'
                  : color,
                opacity: day.level === 0 ? 0.4 : 0.3 + day.level * 0.2,
              }}
              title={`${day.date}: ${day.count} activities`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[9px] text-[var(--color-text-muted)]">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="w-[9px] h-[9px] rounded-sm"
              style={{
                backgroundColor: level === 0 ? 'var(--color-surface-hover)' : color,
                opacity: level === 0 ? 0.4 : 0.3 + level * 0.2,
              }}
            />
          ))}
          <span className="text-[9px] text-[var(--color-text-muted)]">More</span>
        </div>
      </div>
    </div>
  )
}

function StatBadge({ icon, value, label, color, highlight }) {
  return (
    <div
      className="flex-1 p-2.5 rounded-xl text-center"
      style={{
        backgroundColor: `${color}10`,
        border: highlight ? `2px solid ${color}` : '2px solid transparent',
      }}
    >
      <span className="text-sm">{icon}</span>
      <p className="text-base font-bold m-0" style={{ color }}>{value}</p>
      <p className="text-[9px] text-[var(--color-text-muted)] m-0">{label}</p>
    </div>
  )
}

function Sparkline({ data, color }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const height = 32
  const width = 100
  const step = width / (data.length - 1)

  const points = data.map((val, i) => {
    const x = i * step
    const y = height - (val / max) * (height - 4) - 2
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '32px' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      {(() => {
        const last = points[points.length - 1].split(',')
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
      })()}
    </svg>
  )
}

function TrendIndicator({ trend, color }) {
  if (trend.length < 2) return null
  const recent = trend[trend.length - 1]
  const previous = trend[trend.length - 2]
  const diff = recent - previous

  if (diff === 0) return <span className="text-[10px] text-[var(--color-text-muted)]">Steady</span>

  return (
    <span className="text-[10px] font-medium" style={{ color: diff > 0 ? '#22c55e' : '#ef4444' }}>
      {diff > 0 ? '\u2191' : '\u2193'} {diff > 0 ? 'Improving' : 'Dipping'}
    </span>
  )
}

function computeInsights(pillar) {
  const data = loadData()
  const habits = getHabitsForPillar(pillar)
  const completions = data.completions || {}

  // 30-day heatmap
  const heatmapData = []
  const dailyCounts = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)

    // Count: habit completions + journal logs for this date
    let count = 0
    for (const h of habits) {
      if (completions[key]?.[h.id]) count++
    }
    const dayLogs = (data.logs || []).filter((l) => l.date === key && l.pillar === pillar)
    count += dayLogs.length

    dailyCounts[key] = count
    const level = count === 0 ? 0 : Math.min(Math.ceil(count / 1.5), 4)
    heatmapData.push({ date: key, count, level })
  }

  // Weekly trend (last 4 weeks of activity count)
  const weeklyTrend = []
  for (let w = 3; w >= 0; w--) {
    let weekTotal = 0
    for (let d = 0; d < 7; d++) {
      const date = new Date()
      date.setDate(date.getDate() - w * 7 - d)
      const key = date.toISOString().slice(0, 10)
      weekTotal += dailyCounts[key] || 0
    }
    weeklyTrend.push(weekTotal)
  }

  // Best streak and current streak (any habit in this pillar completed)
  let bestStreak = 0
  let currentStreak = 0
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const anyDone = habits.some((h) => completions[key]?.[h.id])
    const anyLog = (data.logs || []).some((l) => l.date === key && l.pillar === pillar)

    if (anyDone || anyLog) {
      streak++
      bestStreak = Math.max(bestStreak, streak)
    } else {
      if (i === 0) {
        // Today not done yet, don't break
        continue
      }
      if (i === 1 && streak === 0) continue // Grace for yesterday
      if (streak > 0) {
        if (currentStreak === 0) currentStreak = streak
        streak = 0
      }
    }
  }
  if (currentStreak === 0) currentStreak = streak

  const totalLogs = (data.logs || []).filter((l) => l.pillar === pillar).length

  return { heatmapData, weeklyTrend, bestStreak, currentStreak, totalLogs }
}
