'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { UserSettings } from '@/types'

type Props = {
  settings: UserSettings
  onChange: (s: UserSettings) => void
  onClose: () => void
}

const STYLES: Array<UserSettings['stack_style']> = ['Shuffled', 'Aligned', 'Slipped']

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [local, setLocal] = useState<UserSettings>(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 250)
    return () => clearTimeout(t)
  }, [local]) // eslint-disable-line

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown) }
  }, [onClose])

  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) =>
    setLocal(p => ({ ...p, [k]: v }))

  const bdr = '#2a2218'
  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const lbl: React.CSSProperties = { color: dim, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase' }
  const val: React.CSSProperties = { color: ink, fontSize: '0.65rem' }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        right: 0,
        width: 284,
        background: '#1a1510',
        border: `1px solid ${bdr}`,
        borderRadius: 4,
        padding: '1rem',
        boxShadow: '0 16px 56px rgba(0,0,0,0.85)',
        zIndex: 200,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: ink, fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 300 }}>
          Page stack
        </h3>
        <button onClick={onClose} style={{ color: dim, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
          <X size={12} />
        </button>
      </div>

      {/* Stack style */}
      <p style={{ ...lbl, marginBottom: 8 }}>Stack style</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {STYLES.map(s => (
          <button
            key={s}
            onClick={() => set('stack_style', s)}
            style={{
              flex: 1, padding: '4px 0', fontSize: '0.62rem', letterSpacing: '0.04em',
              borderRadius: 3, cursor: 'pointer',
              background: local.stack_style === s ? '#2d1520' : 'transparent',
              border: `1px solid ${local.stack_style === s ? '#6b2737' : bdr}`,
              color: local.stack_style === s ? '#c06878' : dim,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Pages visible */}
      <div style={{ marginBottom: 12 }}>
        <div style={row}><span style={lbl}>Pages visible</span><span style={val}>{local.pages_visible}</span></div>
        <input type="range" min={1} max={5} value={local.pages_visible}
          onChange={e => set('pages_visible', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#6b2737' }} />
      </div>

      {/* Gap */}
      <div style={{ marginBottom: 12 }}>
        <div style={row}><span style={lbl}>Gap between pages</span><span style={val}>{local.gap}px</span></div>
        <input type="range" min={2} max={28} value={local.gap}
          onChange={e => set('gap', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#6b2737' }} />
      </div>

      {/* Shadow depth */}
      <div>
        <div style={row}><span style={lbl}>Shadow depth</span><span style={val}>{local.shadow_depth}px</span></div>
        <input type="range" min={2} max={24} value={local.shadow_depth}
          onChange={e => set('shadow_depth', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#6b2737' }} />
      </div>
    </div>
  )
}
