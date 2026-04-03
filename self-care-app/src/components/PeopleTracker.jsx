import { useState, useEffect } from 'react'
import {
  getPeople,
  addPerson,
  deletePerson,
  addInteraction,
  getInteractionsForPerson,
  getLastInteraction,
  daysSince,
  getTodayKey,
  generateId,
} from '../utils/storage'

const cadenceOptions = [
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 30, label: 'Monthly' },
]

const interactionTypes = [
  { value: 'call', label: 'Call', icon: '\u{1F4DE}' },
  { value: 'hangout', label: 'Hangout', icon: '\u{1F91D}' },
  { value: 'text', label: 'Text', icon: '\u{1F4AC}' },
  { value: 'other', label: 'Other', icon: '\u{2728}' },
]

export default function PeopleTracker() {
  const [people, setPeople] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCadence, setNewCadence] = useState(7)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setPeople(getPeople())
  }

  function handleAdd() {
    if (!newName.trim()) return
    addPerson({
      id: generateId(),
      name: newName.trim(),
      cadenceDays: newCadence,
      createdAt: new Date().toISOString(),
    })
    setNewName('')
    setNewCadence(7)
    setShowAdd(false)
    refresh()
  }

  function handleDelete(personId) {
    deletePerson(personId)
    refresh()
  }

  function handleLogInteraction(personId, type) {
    addInteraction({
      id: generateId(),
      personId,
      type,
      date: getTodayKey(),
      createdAt: new Date().toISOString(),
    })
    refresh()
  }

  // Sort: overdue first, then by days since last contact (descending)
  const sortedPeople = [...people].sort((a, b) => {
    const aDays = daysSince(getLastInteraction(a.id)?.date)
    const bDays = daysSince(getLastInteraction(b.id)?.date)
    const aOverdue = aDays >= a.cadenceDays
    const bOverdue = bDays >= b.cadenceDays
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    return bDays - aDays
  })

  if (people.length === 0 && !showAdd) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-4xl mb-3 opacity-40">{'\u{1F465}'}</div>
        <p className="text-[var(--color-text-muted)] font-medium m-0">No people added yet</p>
        <p className="text-sm text-[var(--color-text-muted)] opacity-70 mt-1 mb-4 m-0">
          Add people you want to stay connected with
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-5 py-2.5 rounded-xl border-none bg-[var(--color-connect)] text-white text-sm font-medium cursor-pointer"
        >
          + Add Someone
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide m-0">
          People
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
          style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--color-connect)' }}
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <AddPersonForm
          name={newName}
          cadence={newCadence}
          onNameChange={setNewName}
          onCadenceChange={setNewCadence}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        {sortedPeople.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            onLog={(type) => handleLogInteraction(person.id, type)}
            onDelete={() => handleDelete(person.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PersonCard({ person, onLog, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const lastInteraction = getLastInteraction(person.id)
  const days = daysSince(lastInteraction?.date)
  const isOverdue = days >= person.cadenceDays
  const isNever = !lastInteraction
  const recentInteractions = getInteractionsForPerson(person.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            backgroundColor: isOverdue || isNever ? 'rgba(239, 68, 68, 0.15)' : 'rgba(236, 72, 153, 0.15)',
            color: isOverdue || isNever ? '#ef4444' : 'var(--color-connect)',
          }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left bg-transparent border-none cursor-pointer p-0"
        >
          <p className="text-sm font-medium text-[var(--color-text)] m-0">{person.name}</p>
          <p className="text-[10px] m-0 mt-0.5" style={{ color: isOverdue || isNever ? '#ef4444' : 'var(--color-text-muted)' }}>
            {isNever
              ? '\u{26A0}\u{FE0F} Never connected'
              : isOverdue
                ? `\u{26A0}\u{FE0F} ${days}d ago \u2014 overdue`
                : `${days === 0 ? 'Today' : days + 'd ago'} \u2022 ${cadenceLabel(person.cadenceDays)}`
            }
          </p>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          {/* Quick log buttons */}
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-2 m-0">Log interaction</p>
          <div className="flex gap-2 mb-3">
            {interactionTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => onLog(t.value)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border border-[var(--color-border)] bg-transparent cursor-pointer active:scale-95 transition-transform"
              >
                <span className="text-base">{t.icon}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Recent history */}
          {recentInteractions.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1 m-0">Recent</p>
              {recentInteractions.map((i) => {
                const typeInfo = interactionTypes.find((t) => t.value === i.type)
                return (
                  <div key={i.id} className="flex items-center gap-2 py-1">
                    <span className="text-xs">{typeInfo?.icon || '\u{2728}'}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {typeInfo?.label || i.type} \u2022 {formatInteractionDate(i.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={onDelete}
            className="text-xs text-red-400 bg-transparent border-none cursor-pointer px-0 py-1"
          >
            Remove person
          </button>
        </div>
      )}
    </div>
  )
}

function AddPersonForm({ name, cadence, onNameChange, onCadenceChange, onSave, onCancel }) {
  return (
    <div className="mb-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Person's name"
        className="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary-light)] transition-colors mb-3"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs text-[var(--color-text-muted)] shrink-0">Stay in touch:</label>
        <div className="flex gap-1 flex-wrap">
          {cadenceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onCadenceChange(opt.value)}
              className="px-3 py-1.5 rounded-lg border-none text-xs font-medium cursor-pointer transition-all"
              style={{
                backgroundColor: cadence === opt.value ? 'var(--color-connect)' : 'var(--color-surface-hover)',
                color: cadence === opt.value ? 'white' : 'var(--color-text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!name.trim()}
          className="flex-1 py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer disabled:opacity-40 bg-[var(--color-connect)]"
        >
          Add Person
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

function cadenceLabel(days) {
  if (days <= 7) return 'weekly'
  if (days <= 14) return 'biweekly'
  return 'monthly'
}

function formatInteractionDate(dateStr) {
  const d = daysSince(dateStr)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}
