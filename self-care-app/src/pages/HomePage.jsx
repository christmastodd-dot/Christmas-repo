import PillarCard from '../components/PillarCard'
import { getTodayKey } from '../utils/storage'

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

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="mb-6">
        <p className="text-sm text-[var(--color-text-muted)] m-0">{formatDate(today)}</p>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mt-1 mb-0">
          {greeting}
        </h1>
      </div>

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
