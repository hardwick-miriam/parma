'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/insights', label: 'Insights' },
  { href: '/review', label: 'Review' },
  { href: '/food', label: 'Food' },
  { href: '/wardrobe', label: 'Wardrobe' },
  { href: '/settings', label: 'Settings' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-0.5 whitespace-nowrap">
      {ITEMS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
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
