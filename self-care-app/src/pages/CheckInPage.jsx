import { useState, useEffect } from 'react'
import { loadData, saveData, getTodayKey, generateId } from '../utils/storage'

const pillars = [
  {
    key: 'learn',
    title: 'Learning',
    icon: '\u{1F4DA}',
    color: 'var(--color-learn)',
    prompt: 'Did you learn or practice something today?',
  },
  {
    key: 'connect',
    title: 'Connections',
    icon: '\u{1F49C}',
    color: 'var(--color-connect)',
    prompt: 'Were you present for someone today?',
  },
  {
    key: 'nutrition',
    title: 'Eating Well',
    icon: '\u{1F957}',
    color: 'var(--color-nutrition)',
    prompt: 'How did you nourish your body today?',
  },
  {
    key: 'body',
    title: 'Body Care',
    icon: '\u{26A1}',
    color: 'var(--color-body)',
    prompt: 'Did you move and take care of your body?',
  },
]

const ratingLabels = ['Skipped', 'Meh', 'Okay', 'Good', 'Great']
const ratingEmojis = ['\u{1F6AB}', '\u{1F615}', '\u{1F642}', '\u{1F60A}', '\u{1F31F}']

export default function CheckInPage({ onNavigate }) {
  const todayKey = getTodayKey()
  const [ratings, setRatings] = useState({ learn: 0, connect: 0, nutrition: 0, body: 0 })
  const [notes, setNotes] = useState({ learn: '', connect: '', nutrition: '', body: '' })
  const [overallMood, setOverallMood] = useState(0)
  const [saved, setSaved] = useState(false)
  const [existingId, setExistingId] = useState(null)

  useEffect(() => {
    const data = loadData()
    const existing = data.checkins.find((c) => c.date === todayKey)
    if (existing) {
      setRatings(existing.ratings)
      setNotes(existing.notes)
      setOverallMood(existing.overallMood)
      setExistingId(existing.id)
    }
  }, [todayKey])

  function handleRating(pillar, value) {
    setRatings((prev) => ({ ...prev, [pillar]: prev[pillar] === value ? 0 : value }))
    setSaved(false)
  }

  function handleNote(pillar, value) {
    setNotes((prev) => ({ ...prev, [pillar]: value }))
    setSaved(false)
  }

  function handleSave() {
    const data = loadData()
    const checkin = {
      id: existingId || generateId(),
      date: todayKey,
      ratings,
      notes,
      overallMood,
      updatedAt: new Date().toISOString(),
    }

    if (existingId) {
      const idx = data.checkins.findIndex((c) => c.id === existingId)
      if (idx !== -1) data.checkins[idx] = checkin
    } else {
      data.checkins.push(checkin)
      setExistingId(checkin.id)
    }

    saveData(data)
    setSaved(true)
  }

  const filledCount = Object.values(ratings).filter((r) => r > 0).length

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)] m-0">Daily Check-In</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 m-0">
          {formatDate(todayKey)} {existingId ? '(updating)' : ''}
        </p>
      </div>

      {/* Overall mood */}
      <div className="mb-6 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <p className="text-sm font-medium text-[var(--color-text)] m-0 mb-3">
          How are you feeling overall?
        </p>
        <div className="flex justify-between gap-1">
          {ratingEmojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { setOverallMood(overallMood === i + 1 ? 0 : i + 1); setSaved(false) }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-none cursor-pointer transition-all ${
                overallMood === i + 1
                  ? 'bg-[var(--color-primary)] bg-opacity-20 scale-110'
                  : 'bg-transparent'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{ratingLabels[i]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pillar ratings */}
      <div className="flex flex-col gap-4">
        {pillars.map((pillar) => (
          <PillarCheckIn
            key={pillar.key}
            pillar={pillar}
            rating={ratings[pillar.key]}
            note={notes[pillar.key]}
            onRate={(val) => handleRating(pillar.key, val)}
            onNote={(val) => handleNote(pillar.key, val)}
          />
        ))}
      </div>

      {/* Save button */}
      <div className="mt-6 mb-4">
        <button
          onClick={handleSave}
          className={`w-full py-3.5 rounded-2xl border-none font-semibold text-base cursor-pointer transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-[var(--color-primary)] text-white active:scale-[0.98]'
          }`}
        >
          {saved ? '\u2713 Saved!' : existingId ? 'Update Check-In' : 'Save Check-In'}
        </button>
        <p className="text-xs text-center text-[var(--color-text-muted)] mt-2 m-0">
          {filledCount}/4 pillars rated
        </p>
      </div>
    </div>
  )
}

function PillarCheckIn({ pillar, rating, note, onRate, onNote }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{pillar.icon}</span>
        <span className="text-sm font-semibold text-[var(--color-text)]">{pillar.title}</span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] m-0 mb-3">{pillar.prompt}</p>

      {/* Rating dots */}
      <div className="flex gap-2 mb-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            onClick={() => onRate(val)}
            className="border-none bg-transparent cursor-pointer p-0 transition-transform active:scale-90"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                backgroundColor: rating >= val ? pillar.color : 'var(--color-surface-hover)',
                color: rating >= val ? 'white' : 'var(--color-text-muted)',
                transform: rating === val ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {val}
            </div>
          </button>
        ))}
        {rating > 0 && (
          <span className="flex items-center text-xs text-[var(--color-text-muted)] ml-auto">
            {ratingLabels[rating - 1]}
          </span>
        )}
      </div>

      {/* Expandable note */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[var(--color-primary-light)] bg-transparent border-none cursor-pointer p-0 mt-1"
      >
        {expanded ? 'Hide note' : note ? 'Edit note' : '+ Add a note'}
      </button>
      {expanded && (
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Quick reflection..."
          rows={2}
          className="w-full mt-2 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm resize-none outline-none focus:border-[var(--color-primary-light)] transition-colors"
        />
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
