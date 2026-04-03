import { useState } from 'react'
import { addHabit, generateId } from '../utils/storage'

const steps = [
  {
    title: 'Welcome',
    subtitle: 'Your personal self-care tracker',
    body: 'Track four pillars of well-being: learning new skills, staying connected with people, eating well, and taking care of your body.',
    icon: '\u2728',
  },
  {
    title: 'Learning Skills',
    subtitle: 'What are you working on?',
    icon: '\u{1F4DA}',
    pillar: 'learn',
    color: 'var(--color-learn)',
    suggestions: ['Practice guitar 30 min', 'Read 20 pages', 'Study a language', 'Work on side project', 'Take an online course'],
  },
  {
    title: 'Connections',
    subtitle: 'Stay present for your people',
    icon: '\u{1F49C}',
    pillar: 'connect',
    color: 'var(--color-connect)',
    suggestions: ['Call a family member', 'Quality time with partner', 'Text a friend', 'Have a real conversation', 'Plan something social'],
  },
  {
    title: 'Eating Well',
    subtitle: 'Nourish your body',
    icon: '\u{1F957}',
    pillar: 'nutrition',
    color: 'var(--color-nutrition)',
    suggestions: ['Eat a home-cooked meal', 'Eat vegetables', 'Drink 8 glasses of water', 'No late-night snacking', 'Meal prep'],
  },
  {
    title: 'Body Care',
    subtitle: 'Move, rest, recover',
    icon: '\u{26A1}',
    pillar: 'body',
    color: 'var(--color-body)',
    suggestions: ['Exercise 30 min', 'Go for a walk', 'Stretch or yoga', 'Get 7+ hours of sleep', 'Take a rest day'],
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState({})

  const current = steps[step]
  const isLastStep = step === steps.length - 1

  function toggleSuggestion(pillar, name) {
    setSelected((prev) => {
      const pillarSet = new Set(prev[pillar] || [])
      if (pillarSet.has(name)) {
        pillarSet.delete(name)
      } else {
        pillarSet.add(name)
      }
      return { ...prev, [pillar]: [...pillarSet] }
    })
  }

  function handleFinish() {
    // Create habits from selections
    for (const [pillar, names] of Object.entries(selected)) {
      for (const name of names) {
        addHabit({
          id: generateId(),
          pillar,
          name,
          weeklyGoal: 5,
          createdAt: new Date().toISOString(),
        })
      }
    }
    localStorage.setItem('selfcare_onboarded', 'true')
    onComplete()
  }

  function handleSkip() {
    localStorage.setItem('selfcare_onboarded', 'true')
    onComplete()
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-8">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === step ? '24px' : '8px',
              backgroundColor: i === step ? 'var(--color-primary)' : 'var(--color-surface-hover)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-4">{current.icon}</span>
          <h1 className="text-2xl font-bold text-[var(--color-text)] m-0">{current.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 m-0">{current.subtitle}</p>
        </div>

        {current.body && (
          <p className="text-sm text-[var(--color-text-muted)] text-center leading-relaxed mb-6 m-0">
            {current.body}
          </p>
        )}

        {current.suggestions && (
          <div className="flex flex-col gap-2 mb-6">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide m-0">
              Pick habits to start with (optional)
            </p>
            {current.suggestions.map((name) => {
              const isSelected = (selected[current.pillar] || []).includes(name)
              return (
                <button
                  key={name}
                  onClick={() => toggleSuggestion(current.pillar, name)}
                  className="w-full p-3 rounded-xl border text-left text-sm font-medium cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    borderColor: isSelected ? current.color : 'var(--color-border)',
                    backgroundColor: isSelected ? `${current.color}15` : 'var(--color-surface)',
                    color: isSelected ? current.color : 'var(--color-text)',
                  }}
                >
                  <span className="mr-2">{isSelected ? '\u2713' : '\u{25CB}'}</span>
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-auto pt-4">
        {step === 0 ? (
          <>
            <button
              onClick={handleSkip}
              className="flex-1 py-3.5 rounded-2xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm font-medium cursor-pointer"
            >
              Skip Setup
            </button>
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-2xl border-none bg-[var(--color-primary)] text-white text-sm font-semibold cursor-pointer"
            >
              Get Started
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-3.5 rounded-2xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={isLastStep ? handleFinish : () => setStep(step + 1)}
              className="flex-1 py-3.5 rounded-2xl border-none bg-[var(--color-primary)] text-white text-sm font-semibold cursor-pointer"
            >
              {isLastStep ? 'Finish Setup' : 'Next'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
