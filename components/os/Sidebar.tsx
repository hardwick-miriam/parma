'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export const MODULES: { href: string; label: string; icon: string }[] = [
  { href: '/main', label: 'Main', icon: '🏠' },
  { href: '/gym', label: 'Gym', icon: '🏋️' },
  { href: '/food', label: 'Food', icon: '🍽️' },
  { href: '/body', label: 'Body', icon: '🫁' },
  { href: '/media', label: 'Media', icon: '🎬' },
  { href: '/wardrobe', label: 'Wardrobe', icon: '👕' },
  { href: '/journal', label: 'Journal', icon: '📓' },
  { href: '/health', label: 'Health', icon: '❤️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

// Kept reachable but deliberately separate from the 9 named modules — this is
// the pre-existing bento grid, not part of the new module set.
const GRID_ITEM = { href: '/grid', label: 'Grid', icon: '📊' }

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
          width: 'var(--os-sidebar-w, 208px)',
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

        <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            href={GRID_ITEM.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: isActive(pathname, GRID_ITEM.href) ? 'var(--accent-dim)' : 'transparent',
              color: isActive(pathname, GRID_ITEM.href) ? 'var(--accent)' : 'var(--text-subtle)',
            }}
          >
            <span className="text-base w-5 text-center shrink-0" aria-hidden>{GRID_ITEM.icon}</span>
            {GRID_ITEM.label}
          </Link>
        </div>
      </nav>

      {/* Bottom tab bar — narrow/mobile widths, icons only, scrollable */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center gap-0.5 overflow-x-auto px-1"
        style={{
          background: 'rgba(17,17,19,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          paddingTop: '0.4rem',
          paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom))',
          scrollbarWidth: 'none',
        }}
        aria-label="Module navigation"
      >
        {[...MODULES, GRID_ITEM].map((m) => {
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
