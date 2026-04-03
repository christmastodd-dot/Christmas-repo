export default function PillarCard({ title, color, icon, description, count, onTap }) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--color-text)] m-0">
              {title}
            </h3>
            {count !== undefined && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {count}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5 m-0">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}
