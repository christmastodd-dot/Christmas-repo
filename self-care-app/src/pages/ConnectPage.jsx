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

      <EmptyState
        message="No connections added yet"
        sub="Add people you want to stay connected with"
      />
    </div>
  )
}

function EmptyState({ message, sub }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-4xl mb-3 opacity-40">{'\u{1F465}'}</div>
      <p className="text-[var(--color-text-muted)] font-medium m-0">{message}</p>
      <p className="text-sm text-[var(--color-text-muted)] opacity-70 mt-1 m-0">{sub}</p>
    </div>
  )
}
