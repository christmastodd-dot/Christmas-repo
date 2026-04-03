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

      <EmptyState
        message="No skills tracked yet"
        sub="Add skills you're learning and log practice sessions"
      />
    </div>
  )
}

function EmptyState({ message, sub }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-4xl mb-3 opacity-40">{'\u{1F3AF}'}</div>
      <p className="text-[var(--color-text-muted)] font-medium m-0">{message}</p>
      <p className="text-sm text-[var(--color-text-muted)] opacity-70 mt-1 m-0">{sub}</p>
    </div>
  )
}
