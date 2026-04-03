import { useEffect, useState } from 'react'
import PillarCard from '../components/PillarCard'
import { loadData, getTodayKey } from '../utils/storage'

const pillars = [
  {
    id: 'learn',
    title: 'Learning Skills',
    color: 'var(--color-learn)',
    icon: '\u{1F4DA}',
    description: 'Track practice sessions and skill growth',
  },
  {
    id: 'connect',
    title: 'Connections',
    color: 'var(--color-connect)',
    icon: '\u{1F49C}',
    description: 'Be present for family and friends',
  },
  {
    id: 'nutrition',
    title: 'Eating Well',
    color: 'var(--color-nutrition)',
    icon: '\u{1F957}',
    description: 'Nourish your body with good food',
  },
  {
    id: 'body',
    title: 'Body Care',
    color: 'var(--color-body)',
    icon: '\u{26A1}',
    description: 'Move, rest, and take care of yourself',
  },
]

export default function HomePage({ onNavigate }) {
  const today = new Date()
  const greeting = getGreeting()
  const [todayCheckin, setTodayCheckin] = useState(null)

  useEffect(() => {
    const data = loadData()
    const existing = data.checkins.find((c) => c.date === getTodayKey())
    setTodayCheckin(existing || null)
  }, [])

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)] m-0">{formatDate(today)}</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mt-1 mb-0">
            {greeting}
          </h1>
        </div>
        <button
          onClick={() => onNavigate('settings')}
          className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer mt-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Daily check-in CTA */}
      <button
        onClick={() => onNavigate('checkin')}
        className="w-full mb-5 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] active:scale-[0.98] transition-all cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{todayCheckin ? '\u2705' : '\u{1F4DD}'}</span>
            <div>
              <p className="text-base font-semibold text-[var(--color-text)] m-0">
                {todayCheckin ? 'Check-in complete' : 'Daily Check-In'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                {todayCheckin
                  ? `${Object.values(todayCheckin.ratings).filter((r) => r > 0).length}/4 pillars rated — tap to update`
                  : 'How did today go? Rate each pillar'}
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </button>

      {/* Weekly review CTA */}
      <button
        onClick={() => onNavigate('review')}
        className="w-full mb-5 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] active:scale-[0.98] transition-all cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{'\u{1F4CA}'}</span>
            <div>
              <p className="text-base font-semibold text-[var(--color-text)] m-0">
                Weekly Review
              </p>
              <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                See your trends, streaks, and highlights
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </button>

      <div className="flex flex-col gap-3">
        {pillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            title={pillar.title}
            color={pillar.color}
            icon={pillar.icon}
            description={pillar.description}
            onTap={() => onNavigate(pillar.id)}
          />
        ))}
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
