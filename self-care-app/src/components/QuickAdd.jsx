import { useState } from 'react'
import {
  getHabitsForPillar,
  toggleCompletion,
  addLog,
  getTodayKey,
  generateId,
} from '../utils/storage'

const quickActions = [
  {
    id: 'checkin',
    label: 'Check In',
    icon: '\u{1F4DD}',
    color: 'var(--color-primary)',
    type: 'navigate',
    target: 'checkin',
  },
  {
    id: 'habit',
    label: 'Complete Habit',
    icon: '\u2713',
    color: '#22c55e',
    type: 'habit',
  },
  {
    id: 'learn-log',
    label: 'Log Learning',
    icon: '\u{1F4DA}',
    color: 'var(--color-learn)',
    type: 'quicklog',
    pillar: 'learn',
  },
  {
    id: 'connect-log',
    label: 'Log Connection',
    icon: '\u{1F49C}',
    color: 'var(--color-connect)',
    type: 'quicklog',
    pillar: 'connect',
  },
  {
    id: 'nutrition-log',
    label: 'Log Meal',
    icon: '\u{1F957}',
    color: 'var(--color-nutrition)',
    type: 'quicklog',
    pillar: 'nutrition',
  },
  {
    id: 'body-log',
    label: 'Log Activity',
    icon: '\u{26A1}',
    color: 'var(--color-body)',
    type: 'quicklog',
    pillar: 'body',
  },
]

const quickLogCategories = {
  learn: ['Practice', 'Study', 'Reading', 'Course'],
  connect: ['Quality time', 'Deep talk', 'Call', 'Text'],
  nutrition: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
  body: ['Workout', 'Walk', 'Stretch', 'Rest day'],
}

export default function QuickAdd({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [subMenu, setSubMenu] = useState(null) // 'habit' | pillar key | null
  const [saved, setSaved] = useState(false)

  function handleAction(action) {
    if (action.type === 'navigate') {
      setOpen(false)
      onNavigate(action.target)
    } else if (action.type === 'habit') {
      setSubMenu('habit')
    } else if (action.type === 'quicklog') {
      setSubMenu(action.pillar)
    }
  }

  function handleHabitComplete(habitId) {
    toggleCompletion(habitId, getTodayKey())
    flashSaved()
  }

  function handleQuickLog(pillar, category) {
    addLog({
      id: generateId(),
      pillar,
      category,
      duration: null,
      notes: null,
      feeling: null,
      date: getTodayKey(),
      createdAt: new Date().toISOString(),
    })
    flashSaved()
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setSubMenu(null)
      setOpen(false)
    }, 800)
  }

  function close() {
    setOpen(false)
    setSubMenu(null)
  }

  // Get uncompleted habits for the habit submenu
  const allHabits = subMenu === 'habit'
    ? ['learn', 'connect', 'nutrition', 'body'].flatMap((p) => {
        const habits = getHabitsForPillar(p)
        const todayKey = getTodayKey()
        return habits.map((h) => ({ ...h, pillarKey: p }))
      })
    : []

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={close}
        />
      )}

      {/* Menu */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 max-w-[280px]">
          {saved ? (
            <div className="bg-green-600 text-white px-4 py-3 rounded-2xl text-sm font-medium text-center">
              {'\u2713'} Saved!
            </div>
          ) : subMenu === 'habit' ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-2 max-h-[300px] overflow-y-auto">
              <button
                onClick={() => setSubMenu(null)}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer mb-1"
              >
                {'\u2190'} Back
              </button>
              {allHabits.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-2 m-0">No habits defined yet</p>
              ) : (
                allHabits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleHabitComplete(h.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-transparent border-none text-sm text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2"
                  >
                    <span className="text-xs">{pillarIcon(h.pillarKey)}</span>
                    {h.name}
                  </button>
                ))
              )}
            </div>
          ) : subMenu ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-2">
              <button
                onClick={() => setSubMenu(null)}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer mb-1"
              >
                {'\u2190'} Back
              </button>
              {(quickLogCategories[subMenu] || []).map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleQuickLog(subMenu, cat)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-transparent border-none text-sm text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-2 flex flex-col gap-0.5">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-transparent border-none text-sm text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${action.color}20`, color: action.color }}
                  >
                    {action.icon}
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => open ? close() : setOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full border-none bg-[var(--color-primary)] text-white text-2xl font-light cursor-pointer shadow-lg transition-transform active:scale-90 flex items-center justify-center"
        style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
      >
        +
      </button>
    </>
  )
}

function pillarIcon(key) {
  const icons = { learn: '\u{1F4DA}', connect: '\u{1F49C}', nutrition: '\u{1F957}', body: '\u{26A1}' }
  return icons[key] || ''
}
