'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { MOBILE_TAB_BAR_HEIGHT_REM } from '@/lib/layoutConstants'

export const MODULES: { href: string; label: string; icon: string }[] = [
  { href: '/main', label: 'Main', icon: '🏠' },
  { href: '/gym', label: 'Gym', icon: '🏋️' },
  { href: '/food', label: 'Food', icon: '🍽️' },
  { href: '/body', label: 'Body', icon: '🫁' },
  { href: '/media', label: 'Media', icon: '🎬' },
  { href: '/wardrobe', label: 'Wardrobe', icon: '👕' },
  { href: '/journal', label: 'Journal', icon: '📓' },
  { href: '/health', label: 'Health', icon: '❤️' },
  { href: '/finances', label: 'Finances', icon: '💰' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Persistent left rail — portrait monitors and desktop/tablet widths (sm+) */}
      <nav
        className="hidden sm:flex fixed left-0 top-0 bottom-0 z-40 flex-col gap-1 py-6 px-3 overflow-y-auto"
        style={{
          width: '13rem', // matches app/(os)/layout.tsx's sm:pl-52 (13rem) exactly
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
        aria-label="Module navigation"
      >
        <Link href="/main" className="flex items-center gap-2 px-3 mb-6 shrink-0">
          <Image src="/logo.png" alt="Parma" width={28} height={28} quality={100} style={{ mixBlendMode: 'screen', borderRadius: 4 }} />
          <span className="text-sm font-bold text-text">Parma</span>
        </Link>

        <div className="flex flex-col gap-0.5 flex-1">
          {MODULES.map((m) => {
            const active = isActive(pathname, m.href)
            return (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                <span className="text-base w-5 text-center shrink-0" aria-hidden>{m.icon}</span>
                {m.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom tab bar — narrow/mobile widths, icons only, scrollable */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center gap-0.5 overflow-x-auto px-1"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          // Explicit height (not left to organic content sizing) so
          // ContextualLogBar's mobile offset — derived from this exact
          // constant — can never silently drift out of sync with it.
          height: `calc(${MOBILE_TAB_BAR_HEIGHT_REM}rem + env(safe-area-inset-bottom))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          scrollbarWidth: 'none',
        }}
        aria-label="Module navigation"
      >
        {MODULES.map((m) => {
          const active = isActive(pathname, m.href)
          return (
            <Link
              key={m.href}
              href={m.href}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg shrink-0 min-w-[52px]"
              style={{ color: active ? 'var(--accent)' : 'var(--text-subtle)' }}
            >
              <span className="text-lg" aria-hidden>{m.icon}</span>
              <span className="text-[9px] font-medium leading-none">{m.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
