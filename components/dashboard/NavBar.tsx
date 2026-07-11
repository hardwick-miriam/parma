'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Food/Wardrobe/Settings moved into the new module shell (see app/(os)/) —
// this bar now only covers what's still exclusively served by the old
// top-nav chrome. The old "Dashboard" item pointed at /grid, which is
// retired (redirects to /main); removed rather than repointed since
// "→ New OS" already goes to the same place.
const ITEMS = [
  { href: '/insights', label: 'Insights' },
  { href: '/review', label: 'Review' },
  { href: '/main', label: '→ New OS' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-0.5 whitespace-nowrap">
      {ITEMS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active
                ? 'bg-accent/15 text-accent'
                : 'text-text-subtle hover:text-text-muted hover:bg-surface-hover'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
