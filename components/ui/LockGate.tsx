'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

export function LockBadge({ title }: { title?: string }) {
  return (
    <Link href="/subscribe" title={title || 'Upgrade to Parma Premium'}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5, verticalAlign: 'middle' }}
      onClick={e => e.stopPropagation()}>
      <Lock size={10} style={{ color: '#c0c0c0', opacity: 0.7 }} />
    </Link>
  )
}

type Props = {
  locked: boolean
  children: React.ReactNode
  overlay?: boolean
}

export default function LockGate({ locked, children, overlay = false }: Props) {
  if (!locked) return <>{children}</>
  if (overlay) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>{children}</div>
        <Link href="/subscribe"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: 'inherit' }}>
          <Lock size={16} color="#c0c0c0" />
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
