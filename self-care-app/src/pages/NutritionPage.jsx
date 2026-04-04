import HabitTracker from '../components/HabitTracker'
import ActivityLog from '../components/ActivityLog'
import PillarInsights from '../components/PillarInsights'

export default function NutritionPage() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-nutrition)' }}
        >
          {'\u{1F957}'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] m-0">Eating Well</h1>
          <p className="text-sm text-[var(--color-text-muted)] m-0">Nourish your body</p>
        </div>
      </div>

      <PillarInsights pillar="nutrition" color="var(--color-nutrition)" />
      <HabitTracker pillar="nutrition" color="var(--color-nutrition)" />

      <div className="mt-6">
        <ActivityLog pillar="nutrition" color="var(--color-nutrition)" />
      </div>
    </div>
  )
}
