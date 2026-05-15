'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from 'use-debounce'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserSettings } from '@/types'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

type Props = {
  userId: string
  initialSettings: UserSettings
}

const STYLES: Array<UserSettings['stack_style']> = ['Shuffled', 'Aligned', 'Slipped']

const STACK_DESC: Record<UserSettings['stack_style'], string> = {
  Shuffled: 'Pages slightly offset — a natural, lived-in feel',
  Aligned: 'Clean straight stack — minimal and precise',
  Slipped: 'Pages rotate slightly deeper in the stack — a fanned deck',
}

export default function SettingsPageClient({ userId, initialSettings }: Props) {
  const supabase = createClient()
  const [settings, setSettings] = useState<UserSettings>(initialSettings)
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (s: UserSettings) => {
    await supabase.from('user_settings').upsert({ ...s, user_id: userId }, { onConflict: 'user_id' })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [supabase, userId])

  const [debouncedSettings] = useDebounce(settings, 500)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _ = debouncedSettings // suppress unused warning — used to trigger save below
  useState(() => { save(debouncedSettings) })

  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) =>
    setSettings(p => { const n = { ...p, [k]: v }; save(n); return n })

  const bdr = '#2a2218'
  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const lbl: React.CSSProperties = { color: dim, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }
  const val: React.CSSProperties = { color: ink, fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
  const section: React.CSSProperties = { borderBottom: `1px solid ${bdr}`, paddingBottom: '1.5rem', marginBottom: '1.5rem' }

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1f' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-20" style={{ background: 'rgba(18,12,8,0.96)', borderColor: '#3a3228', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 p-1" style={{ color: dim }}>
            <ArrowLeft size={14} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>Dashboard</span>
          </Link>
          <span style={{ color: '#3a3228', fontSize: '0.65rem' }}>/</span>
          <span style={{ color: '#6a5a48', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Settings</span>
          {saved && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: '#4a8a4a', fontSize: '0.65rem' }}>
              <Check size={11} /> Saved
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 style={{ color: ink, fontSize: '0.75rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 300, marginBottom: '2.5rem' }}>
          Page stack settings
        </h1>

        {/* Stack style */}
        <div style={section}>
          <p style={{ ...lbl, marginBottom: '1rem' }}>Stack style</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => set('stack_style', s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.75rem 1rem', borderRadius: 3, cursor: 'pointer', textAlign: 'left',
                  background: settings.stack_style === s ? '#2d1520' : 'transparent',
                  border: `1px solid ${settings.stack_style === s ? '#6b2737' : bdr}`,
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: settings.stack_style === s ? '#6b2737' : 'transparent',
                  border: `1px solid ${settings.stack_style === s ? '#6b2737' : dim}`,
                }} />
                <div>
                  <p style={{ color: ink, fontSize: '0.75rem', fontWeight: 300, marginBottom: 2 }}>{s}</p>
                  <p style={{ color: dim, fontSize: '0.65rem' }}>{STACK_DESC[s]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div style={section}>
          <div style={{ marginBottom: 20 }}>
            <div style={row}>
              <span style={lbl}>Pages visible in stack</span>
              <span style={val}>{settings.pages_visible}</span>
            </div>
            <input type="range" min={1} max={5} value={settings.pages_visible}
              onChange={e => set('pages_visible', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6b2737' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ ...lbl, letterSpacing: 0, textTransform: 'none' }}>1</span>
              <span style={{ ...lbl, letterSpacing: 0, textTransform: 'none' }}>5</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={row}>
              <span style={lbl}>Gap between page edges</span>
              <span style={val}>{settings.gap}px</span>
            </div>
            <input type="range" min={2} max={28} value={settings.gap}
              onChange={e => set('gap', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6b2737' }} />
          </div>

          <div>
            <div style={row}>
              <span style={lbl}>Shadow depth</span>
              <span style={val}>{settings.shadow_depth}px</span>
            </div>
            <input type="range" min={2} max={24} value={settings.shadow_depth}
              onChange={e => set('shadow_depth', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6b2737' }} />
          </div>
        </div>

        <p style={{ color: '#3a3228', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
          Settings are saved automatically.
        </p>
      </main>
    </div>
  )
}
