'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserSettings } from '@/types'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { loadGoogleFont } from '@/components/ui/ThemeApplier'

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

const THEMES: Array<{ key: UserSettings['theme']; label: string; desc: string; bg: string; accent: string }> = [
  { key: 'default', label: 'Default', desc: 'Dark academia — deep charcoal and crimson', bg: '#1a1a1f', accent: '#6b2737' },
  { key: 'autumn', label: 'Autumn', desc: 'Warm amber and aged leather', bg: '#18120a', accent: '#a0602a' },
  { key: 'winter', label: 'Winter', desc: 'Cool slate and icy blue', bg: '#0e1420', accent: '#3a6896' },
  { key: 'spring', label: 'Spring', desc: 'Forest green and soft moss', bg: '#0c1810', accent: '#3a6b40' },
]

const EDITOR_FONTS = [
  'EB Garamond',
  'Playfair Display',
  'Lora',
  'Crimson Text',
  'Libre Baskerville',
  'Cormorant Garamond',
  'Spectral',
]

export default function SettingsPageClient({ userId, initialSettings }: Props) {
  const supabase = createClient()
  const [settings, setSettings] = useState<UserSettings>(initialSettings)
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (s: UserSettings) => {
    await supabase.from('user_settings').upsert({ ...s, user_id: userId }, { onConflict: 'user_id' })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [supabase, userId])

  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => {
    setSettings(p => {
      const n = { ...p, [k]: v }
      save(n)
      return n
    })
  }

  const applyTheme = (theme: UserSettings['theme']) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('parma-theme', theme)
    set('theme', theme)
  }

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--accent', color)
    localStorage.setItem('parma-accent', color)
    set('accent_color', color)
  }

  const applyFont = (family: string) => {
    loadGoogleFont(family)
    document.documentElement.style.setProperty('--font-editor', `'${family}', Georgia, serif`)
    localStorage.setItem('parma-font', family)
    set('editor_font', family)
  }

  useEffect(() => {
    if (settings.editor_font && settings.editor_font !== 'EB Garamond') {
      loadGoogleFont(settings.editor_font)
    }
  }, [settings.editor_font])

  const bdr = '#2a2218'
  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const lbl: React.CSSProperties = { color: dim, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }
  const val: React.CSSProperties = { color: ink, fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
  const section: React.CSSProperties = { borderBottom: `1px solid ${bdr}`, paddingBottom: '1.5rem', marginBottom: '1.5rem' }

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1f' }}>
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
          Appearance &amp; Writing
        </h1>

        {/* Theme */}
        <div style={section}>
          <p style={{ ...lbl, marginBottom: '1rem' }}>Theme</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {THEMES.map(t => (
              <button key={t.key} onClick={() => applyTheme(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.75rem 1rem', borderRadius: 3, cursor: 'pointer', textAlign: 'left',
                  background: settings.theme === t.key ? t.bg : 'transparent',
                  border: `1px solid ${settings.theme === t.key ? t.accent : bdr}`,
                }}>
                <div style={{ display: 'flex', flexShrink: 0, flexDirection: 'column', gap: 2 }}>
                  <div style={{ width: 20, height: 12, borderRadius: 2, background: t.bg, border: '1px solid #3a3228' }} />
                  <div style={{ width: 20, height: 5, borderRadius: 1, background: t.accent }} />
                </div>
                <div>
                  <p style={{ color: ink, fontSize: '0.72rem', fontWeight: 300, marginBottom: 2 }}>{t.label}</p>
                  <p style={{ color: dim, fontSize: '0.6rem' }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent colour */}
        <div style={section}>
          <p style={{ ...lbl, marginBottom: '0.75rem' }}>Accent colour</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="color" value={settings.accent_color || '#6b2737'}
                onChange={e => applyAccent(e.target.value)}
                style={{ width: 38, height: 34, border: `1px solid ${bdr}`, borderRadius: 3, padding: 2, background: 'transparent', cursor: 'pointer' }} />
              <span style={{ color: dim, fontSize: '0.7rem', fontFamily: 'monospace' }}>{settings.accent_color || '#6b2737'}</span>
            </label>
            <button onClick={() => applyAccent('#6b2737')}
              style={{ color: dim, background: 'none', border: `1px solid ${bdr}`, borderRadius: 3, padding: '4px 10px', fontSize: '0.65rem', cursor: 'pointer' }}>
              Reset
            </button>
          </div>
          <p style={{ color: dim, fontSize: '0.6rem', marginTop: 8 }}>Applied globally — affects buttons, focus rings, and highlights.</p>
        </div>

        {/* Editor font */}
        <div style={section}>
          <p style={{ ...lbl, marginBottom: '1rem' }}>Editor font</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {EDITOR_FONTS.map(family => (
              <button key={family} onClick={() => applyFont(family)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 1rem', borderRadius: 3, cursor: 'pointer',
                  background: settings.editor_font === family ? '#2d1520' : 'transparent',
                  border: `1px solid ${settings.editor_font === family ? '#6b2737' : bdr}`,
                }}>
                <span style={{ fontFamily: `'${family}', Georgia, serif`, color: ink, fontSize: '1rem' }}>{family}</span>
                <span style={{ fontFamily: `'${family}', Georgia, serif`, color: dim, fontSize: '0.75rem', fontStyle: 'italic' }}>the quick brown fox</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stack style */}
        <div style={section}>
          <p style={{ ...lbl, marginBottom: '1rem' }}>Page stack style</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STYLES.map(s => (
              <button key={s} onClick={() => set('stack_style', s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.75rem 1rem', borderRadius: 3, cursor: 'pointer', textAlign: 'left',
                  background: settings.stack_style === s ? '#2d1520' : 'transparent',
                  border: `1px solid ${settings.stack_style === s ? '#6b2737' : bdr}`,
                }}>
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
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
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
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>
          <div>
            <div style={row}>
              <span style={lbl}>Shadow depth</span>
              <span style={val}>{settings.shadow_depth}px</span>
            </div>
            <input type="range" min={2} max={24} value={settings.shadow_depth}
              onChange={e => set('shadow_depth', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>
        </div>

        <p style={{ color: '#3a3228', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
          Settings are saved automatically.
        </p>
      </main>
    </div>
  )
}
