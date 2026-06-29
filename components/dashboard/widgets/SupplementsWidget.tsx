'use client'

import { useState, useTransition } from 'react'
import { removeSupplement } from '@/app/actions'

export function SupplementsWidget({ supplements }: { supplements: string[] | null }) {
  const list = supplements?.filter(Boolean) ?? []
  const [confirmItem, setConfirmItem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRemove(s: string) {
    startTransition(async () => {
      await removeSupplement(s)
      setConfirmItem(null)
    })
  }

  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Supplements</h2>
      {list.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {list.map((s) => (
            <li key={s}>
              {confirmItem === s ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs">
                  <span className="text-red-400">Delete {s}?</span>
                  <button
                    onClick={() => handleRemove(s)}
                    disabled={isPending}
                    className="text-red-400 font-semibold hover:text-red-300 disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmItem(null)}
                    className="text-text-subtle hover:text-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmItem(s)}
                  className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim border border-accent/20 text-accent text-xs font-medium hover:border-red-500/30 transition-colors"
                >
                  {s}
                  <span className="text-accent/40 group-hover:text-red-400 transition-colors">×</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-subtle text-sm">None logged today</p>
      )}
    </div>
  )
}
