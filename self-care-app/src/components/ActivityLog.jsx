import { useState, useEffect } from 'react'
import {
  addLog,
  deleteLog,
  getLogsForPillar,
  getTodayKey,
  generateId,
  daysSince,
} from '../utils/storage'

const feelingOptions = [
  { value: 1, emoji: '\u{1F614}', label: 'Low' },
  { value: 2, emoji: '\u{1F610}', label: 'Meh' },
  { value: 3, emoji: '\u{1F642}', label: 'Good' },
  { value: 4, emoji: '\u{1F60A}', label: 'Great' },
  { value: 5, emoji: '\u{1F929}', label: 'Amazing' },
]

const pillarCategories = {
  learn: ['Practice', 'Study', 'Course', 'Reading', 'Project', 'Other'],
  connect: ['Quality time', 'Deep talk', 'Activity together', 'Helping out', 'Other'],
  nutrition: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Meal prep', 'Water', 'Other'],
  body: ['Workout', 'Walk', 'Run', 'Stretch', 'Sleep', 'Rest day', 'Other'],
}

export default function ActivityLog({ pillar, color }) {
  const [logs, setLogs] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [feeling, setFeeling] = useState(0)

  const categories = pillarCategories[pillar] || []

  useEffect(() => {
    refresh()
  }, [pillar])

  function refresh() {
    setLogs(getLogsForPillar(pillar, 20))
  }

  function handleAdd() {
    if (!category) return
    addLog({
      id: generateId(),
      pillar,
      category,
      duration: duration ? parseInt(duration, 10) : null,
      notes: notes.trim() || null,
      feeling: feeling || null,
      date: getTodayKey(),
      createdAt: new Date().toISOString(),
    })
    setCategory('')
    setDuration('')
    setNotes('')
    setFeeling(0)
    setShowAdd(false)
    refresh()
  }

  function handleDelete(logId) {
    deleteLog(logId)
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide m-0">
          Journal
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
          style={{ backgroundColor: `${color}20`, color }}
        >
          + Log
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          {/* Category */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-lg border-none text-xs font-medium cursor-pointer transition-all"
                style={{
                  backgroundColor: category === cat ? color : 'var(--color-surface-hover)',
                  color: category === cat ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration"
              min="1"
              className="w-24 p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary-light)]"
            />
            <span className="text-xs text-[var(--color-text-muted)]">minutes (optional)</span>
          </div>

          {/* Feeling */}
          <div className="mb-3">
            <p className="text-xs text-[var(--color-text-muted)] mb-1.5 m-0">How did it feel?</p>
            <div className="flex gap-1">
              {feelingOptions.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFeeling(feeling === f.value ? 0 : f.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
                    feeling === f.value ? 'scale-110' : ''
                  }`}
                  style={{
                    backgroundColor: feeling === f.value ? `${color}20` : 'transparent',
                  }}
                >
                  <span className="text-lg">{f.emoji}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)]">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm resize-none outline-none focus:border-[var(--color-primary-light)] mb-3"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!category}
              className="flex-1 py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: color }}
            >
              Save Entry
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Log list */}
      {logs.length === 0 && !showAdd ? (
        <div className="text-center py-8 px-4">
          <p className="text-sm text-[var(--color-text-muted)] opacity-70 m-0">
            No entries yet. Tap + Log to record something.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} color={color} onDelete={() => handleDelete(log.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function LogEntry({ log, color, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const days = daysSince(log.date)
  const feelingInfo = feelingOptions.find((f) => f.value === log.feeling)

  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {log.category.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{log.category}</span>
            {log.duration && (
              <span className="text-[10px] text-[var(--color-text-muted)]">{log.duration}m</span>
            )}
            {feelingInfo && <span className="text-xs">{feelingInfo.emoji}</span>}
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          {log.notes && (
            <p className="text-xs text-[var(--color-text-muted)] mb-2 m-0">{log.notes}</p>
          )}
          <button
            onClick={onDelete}
            className="text-xs text-red-400 bg-transparent border-none cursor-pointer px-0 py-1"
          >
            Delete entry
          </button>
        </div>
      )}
    </div>
  )
}
