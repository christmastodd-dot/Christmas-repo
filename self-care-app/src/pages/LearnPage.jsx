import HabitTracker from '../components/HabitTracker'
import ActivityLog from '../components/ActivityLog'

export default function LearnPage() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-learn)' }}
        >
          {'\u{1F4DA}'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] m-0">Learning Skills</h1>
          <p className="text-sm text-[var(--color-text-muted)] m-0">Track your growth</p>
        </div>
      </div>

      <HabitTracker pillar="learn" color="var(--color-learn)" />

      <div className="mt-6">
        <ActivityLog pillar="learn" color="var(--color-learn)" />
      </div>
    </div>
  )
}
