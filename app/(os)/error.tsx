'use client'

import { useEffect } from 'react'

// Catches any thrown error from a module page's server-side data fetch or
// render (e.g. a synchronous post-processing step after a successful DB
// query) so a real failure shows a recoverable screen instead of a white
// page — the layout (Sidebar, nav) stays mounted since this boundary sits
// below it.
export default function OSError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[os] page error:', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-4 text-center py-20 px-4">
      <span className="text-4xl" aria-hidden>⚠️</span>
      <div>
        <p className="text-lg font-semibold text-text">Something went wrong loading this page</p>
        <p className="text-sm text-text-muted mt-1">Your data is safe — this was a display error, not a data loss.</p>
      </div>
      <button
        onClick={reset}
        className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
        style={{ background: 'var(--accent)' }}
      >
        Try again
      </button>
    </div>
  )
}
