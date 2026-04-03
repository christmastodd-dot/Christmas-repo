import HabitTracker from '../components/HabitTracker'
import ActivityLog from '../components/ActivityLog'

export default function BodyPage() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-body)' }}
        >
          {'\u{26A1}'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] m-0">Body Care</h1>
          <p className="text-sm text-[var(--color-text-muted)] m-0">Move, rest, recover</p>
        </div>
      </div>

      <HabitTracker pillar="body" color="var(--color-body)" />

      <div className="mt-6">
        <ActivityLog pillar="body" color="var(--color-body)" />
      </div>
    </div>
  )
}
