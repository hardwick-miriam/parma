'use client'

import { useEffect, useRef } from 'react'

type MenuItem = {
  label: string
  action: () => void
  danger?: boolean
}

type Props = {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const adjustedX = Math.min(x, window.innerWidth - 180)
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16)

  return (
    <div
      ref={ref}
      className="fixed z-50 py-1 rounded border shadow-lg min-w-40"
      style={{
        left: adjustedX,
        top: adjustedY,
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full text-left px-4 py-2 text-sm"
          style={{
            color: item.danger ? 'var(--danger-hover)' : 'var(--text-primary)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
