import { useState, useEffect } from 'react'
import {
  getHabitsForPillar,
  getCompletionsForDate,
  toggleCompletion,
  addHabit,
  deleteHabit,
  getStreak,
  getWeekCompletionCount,
  getTodayKey,
  generateId,
} from '../utils/storage'

export default function HabitTracker({ pillar, color }) {
  const todayKey = getTodayKey()
  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGoal, setNewGoal] = useState(5)

  useEffect(() => {
    refresh()
  }, [pillar])

  function refresh() {
    setHabits(getHabitsForPillar(pillar))
    setCompletions(getCompletionsForDate(todayKey))
  }

  function handleAdd() {
    if (!newName.trim()) return
    addHabit({
      id: generateId(),
      pillar,
      name: newName.trim(),
      weeklyGoal: newGoal,
      createdAt: new Date().toISOString(),
    })
    setNewName('')
    setNewGoal(5)
    setShowAdd(false)
    refresh()
  }

  function handleToggle(habitId) {
    toggleCompletion(habitId, todayKey)
    refresh()
  }

  function handleDelete(habitId) {
    deleteHabit(habitId)
    refresh()
  }

  if (habits.length === 0 && !showAdd) {
    return (
      <div>
        <EmptyHabits onAdd={() => setShowAdd(true)} />
        {showAdd && (
          <AddHabitForm
            color={color}
            name={newName}
            goal={newGoal}
            onNameChange={setNewName}
            onGoalChange={setNewGoal}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide m-0">
          Habits
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
          style={{ backgroundColor: `${color}20`, color }}
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <AddHabitForm
          color={color}
          name={newName}
          goal={newGoal}
          onNameChange={setNewName}
          onGoalChange={setNewGoal}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            done={!!completions[habit.id]}
            color={color}
            onToggle={() => handleToggle(habit.id)}
            onDelete={() => handleDelete(habit.id)}
          />
        ))}
      </div>
    </div>
  )
}

function HabitRow({ habit, done, color, onToggle, onDelete }) {
  const [showDetails, setShowDetails] = useState(false)
  const streak = getStreak(habit.id)
  const weekCount = getWeekCompletionCount(habit.id)

  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all bg-transparent"
          style={{
            borderColor: done ? color : 'var(--color-border)',
            backgroundColor: done ? color : 'transparent',
          }}
        >
          {done && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 text-left bg-transparent border-none cursor-pointer p-0"
        >
          <p className={`text-sm font-medium m-0 transition-colors ${done ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
            {habit.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {streak > 0 && (
              <span className="text-[10px] font-medium" style={{ color }}>
                {'\u{1F525}'} {streak}d streak
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {weekCount}/{habit.weeklyGoal} this week
            </span>
          </div>
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="flex gap-1">
            <WeekDots habitId={habit.id} color={color} />
          </div>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 bg-transparent border-none cursor-pointer px-2 py-1"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

function WeekDots({ habitId, color }) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const d = new Date()
  const dayOfWeek = d.getDay()
  d.setDate(d.getDate() - dayOfWeek)

  const dots = []
  for (let i = 0; i < 7; i++) {
    const key = d.toISOString().slice(0, 10)
    const completions = getCompletionsForDate(key)
    const done = !!completions[habitId]
    dots.push(
      <div key={i} className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] text-[var(--color-text-muted)]">{days[i]}</span>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
          style={{
            backgroundColor: done ? color : 'var(--color-surface-hover)',
            color: done ? 'white' : 'var(--color-text-muted)',
          }}
        >
          {done ? '\u2713' : ''}
        </div>
      </div>
    )
    d.setDate(d.getDate() + 1)
  }
  return <>{dots}</>
}

function AddHabitForm({ color, name, goal, onNameChange, onGoalChange, onSave, onCancel }) {
  return (
    <div className="mb-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Habit name (e.g., Practice guitar 30 min)"
        className="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary-light)] transition-colors mb-3"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs text-[var(--color-text-muted)]">Weekly goal:</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => onGoalChange(n)}
              className="w-8 h-8 rounded-lg border-none text-xs font-bold cursor-pointer transition-all"
              style={{
                backgroundColor: goal === n ? color : 'var(--color-surface-hover)',
                color: goal === n ? 'white' : 'var(--color-text-muted)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)]">days/wk</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!name.trim()}
          className="flex-1 py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          Add Habit
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function EmptyHabits({ onAdd }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3 opacity-40">{'\u{1F3AF}'}</div>
      <p className="text-[var(--color-text-muted)] font-medium m-0">No habits yet</p>
      <p className="text-sm text-[var(--color-text-muted)] opacity-70 mt-1 mb-4 m-0">
        Define recurring habits to track daily
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 rounded-xl border-none bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer"
      >
        + Add Your First Habit
      </button>
    </div>
  )
}
