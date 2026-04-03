import HabitTracker from '../components/HabitTracker'

export default function ConnectPage() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--color-connect)' }}
        >
          {'\u{1F49C}'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] m-0">Connections</h1>
          <p className="text-sm text-[var(--color-text-muted)] m-0">Stay present for your people</p>
        </div>
      </div>

      <HabitTracker pillar="connect" color="var(--color-connect)" />
    </div>
  )
}
