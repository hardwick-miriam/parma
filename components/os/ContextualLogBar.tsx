'use client'

import { usePathname } from 'next/navigation'
import { LogFlow } from '@/components/dashboard/LogFlow'
import { MODULE_BIAS, moduleContextForPath } from '@/lib/moduleContext'
import { MOBILE_TAB_BAR_HEIGHT_REM } from '@/lib/layoutConstants'

export function ContextualLogBar() {
  const pathname = usePathname()
  const moduleContext = moduleContextForPath(pathname)
  const cfg = moduleContext ? MODULE_BIAS[moduleContext] : undefined

  return (
    <div
      className="fixed bottom-[var(--mobile-log-bar-offset)] sm:bottom-0 left-0 right-0 z-40"
      style={{
        // Mobile-only offset (cleared by the sm:bottom-0 class at sm+, which
        // wins on specificity ties via source order/Tailwind's layer, same
        // as the arbitrary-value class it replaces) — set as a CSS variable,
        // not a plain inline `bottom`, so sm:bottom-0 can still override it
        // on wider viewports. Derived from the same constant Sidebar.tsx
        // uses for the actual bottom-tab-bar height, so the two can't drift.
        ['--mobile-log-bar-offset' as string]: `calc(${MOBILE_TAB_BAR_HEIGHT_REM}rem + env(safe-area-inset-bottom))`,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
        paddingTop: '0.75rem',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* Matches the sidebar width reservation + content max-width from app/(os)/layout.tsx */}
      <div className="sm:pl-52">
        <div className="px-4 sm:px-6 max-w-3xl mx-auto">
          <LogFlow moduleContext={moduleContext} placeholder={cfg?.placeholder} />
        </div>
      </div>
    </div>
  )
}
