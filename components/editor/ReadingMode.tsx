'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  html: string
  darkMode: boolean
  onClose: () => void
}

export default function ReadingMode({ title, html, darkMode, onClose }: Props) {
  const bg = darkMode ? '#0f0c09' : '#f8f4ec'
  const ink = darkMode ? '#e8dfc8' : '#2a1f0a'
  const pageShadow = darkMode
    ? '0 0 80px rgba(0,0,0,0.9)'
    : '0 4px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: darkMode ? '#080604' : '#ede8df' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.5rem',
          color: darkMode ? 'rgba(240,232,208,0.35)' : 'rgba(42,31,10,0.3)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          zIndex: 10,
        }}
        title="Close reading mode (Esc)"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45' }}
      >
        <X size={16} />
      </button>

      {/* Page */}
      <div style={{ maxWidth: '62ch', margin: '0 auto', padding: '5rem 2rem 8rem' }}>
        <div
          style={{
            background: bg,
            boxShadow: pageShadow,
            borderRadius: 2,
            padding: '5rem 4rem',
            color: ink,
          }}
        >
          {title && (
            <h1
              style={{
                fontFamily: 'var(--font-garamond), Georgia, serif',
                fontSize: '1.7rem',
                fontWeight: 400,
                letterSpacing: '0.04em',
                color: ink,
                marginBottom: '2.5rem',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {title}
            </h1>
          )}
          <div
            className="reading-content"
            style={{ color: ink }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
