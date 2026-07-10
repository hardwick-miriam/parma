'use client'

import { usePathname } from 'next/navigation'
import { LogFlow } from '@/components/dashboard/LogFlow'
import { MODULE_BIAS, moduleContextForPath } from '@/lib/moduleContext'

export function ContextualLogBar() {
  const pathname = usePathname()
  const moduleContext = moduleContextForPath(pathname)
  const cfg = moduleContext ? MODULE_BIAS[moduleContext] : undefined

  return (
    <div
      className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40"
      style={{
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
