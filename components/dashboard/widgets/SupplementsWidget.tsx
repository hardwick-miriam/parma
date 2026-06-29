'use client'

export function SupplementsWidget({ supplements }: { supplements: string[] | null }) {
  const list = supplements?.filter(Boolean) ?? []

  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Supplements</h2>
      {list.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {list.map((s) => (
            <li
              key={s}
              className="px-3 py-1 rounded-full bg-accent-dim border border-accent/20 text-accent text-xs font-medium"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-subtle text-sm">None logged today</p>
      )}
    </div>
  )
}
