'use client'

import { useState, useEffect } from 'react'
import type { DailyStats, InjuryWithCheckins, LogEntry } from '@/lib/db/queries'

// ---- Types ------------------------------------------------------------------

type NudgeType = 'no_log' | 'protein' | 'hydration' | 'injury' | 'eod'

export interface NudgeSettings {
  no_log: boolean
  protein: boolean
  hydration: boolean
  injury: boolean
  eod: boolean
}

const DEFAULT_SETTINGS: NudgeSettings = {
  no_log: true,
  protein: true,
  hydration: true,
  injury: true,
  eod: true,
}

const LABELS: Record<NudgeType, string> = {
  no_log: 'Nothing logged yet',
  protein: 'Protein behind',
  hydration: 'Hydration behind',
  injury: 'Injury check-in',
  eod: 'End-of-day reminder',
}

// ---- Hooks ------------------------------------------------------------------

function useNudgeSettings() {
  const [settings, setSettings] = useState<NudgeSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('parma-nudge-settings')
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {}
  }, [])

  function toggle(type: NudgeType) {
    setSettings((prev) => {
      const next = { ...prev, [type]: !prev[type] }
      localStorage.setItem('parma-nudge-settings', JSON.stringify(next))
      return next
    })
  }

  return { settings, toggle }
}

// ---- Nudge computation ------------------------------------------------------

interface Nudge {
  id: string
  type: NudgeType
  headline: string
  sub?: string
}

function computeNudges(
  stats: DailyStats | null,
  logEntries: LogEntry[],
  injuries: InjuryWithCheckins[],
  settings: NudgeSettings
): Nudge[] {
  const hour = new Date().getHours()
  const todayStr = new Date().toISOString().split('T')[0]
  const nudges: Nudge[] = []

  if (settings.no_log && hour >= 9 && logEntries.length === 0) {
    nudges.push({ id: 'no_log', type: 'no_log', headline: "Nothing logged today yet", sub: "Tap the bar below to add an entry" })
  }

  const PROTEIN_TARGET = 150
  if (settings.protein && stats && hour >= 14) {
    const gap = PROTEIN_TARGET - (stats.protein_g ?? 0)
    if (gap > 20) {
      nudges.push({ id: 'protein', type: 'protein', headline: `Protein ${Math.round(gap)}g behind`, sub: `${stats.protein_g ?? 0}g of ${PROTEIN_TARGET}g — ${24 - hour}h left today` })
    }
  }

  const HYDRATION_TARGET_L = 2.0
  if (settings.hydration && stats && hour >= 12) {
    const currentL = (stats.water_ml ?? 0) / 1000
    const gapL = HYDRATION_TARGET_L - currentL
    if (gapL > 0.25) {
      nudges.push({ id: 'hydration', type: 'hydration', headline: `Hydration ${currentL.toFixed(1)}L of ${HYDRATION_TARGET_L.toFixed(1)}L`, sub: `${gapL.toFixed(1)}L to reach target` })
    }
  }

  if (settings.injury && injuries.length > 0 && hour >= 8) {
    for (const inj of injuries) {
      const checkedIn = inj.checkins.some((c) => c.logged_at.startsWith(todayStr))
      if (!checkedIn) {
        nudges.push({ id: `injury_${inj.id}`, type: 'injury', headline: "Injury check-in due", sub: inj.description })
        break
      }
    }
  }

  if (settings.eod && hour >= 20) {
    const missing: string[] = []
    if (!stats || (stats.calories ?? 0) === 0) missing.push('nutrition')
    if (!stats?.sleep_hours) missing.push('sleep')
    if (!stats?.mood) missing.push('mood')
    if (missing.length >= 2) {
      nudges.push({ id: 'eod', type: 'eod', headline: `Missing before bed`, sub: missing.join(' · ') })
    }
  }

  return nudges.slice(0, 3)
}

// ---- Settings popover -------------------------------------------------------

function SettingsPopover({
  settings,
  onToggle,
  onClose,
}: {
  settings: NudgeSettings
  onToggle: (t: NudgeType) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-border bg-surface-elevated shadow-lg p-3 flex flex-col gap-2"
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <p className="text-[10px] text-text-subtle uppercase tracking-widest pb-1">Reminder types</p>
      {(Object.keys(settings) as NudgeType[]).map((type) => (
        <label key={type} className="flex items-center gap-2 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={settings[type]}
            onClick={() => onToggle(type)}
            className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${settings[type] ? 'bg-accent' : 'bg-surface-hover'}`}
          >
            <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${settings[type] ? 'translate-x-3' : 'translate-x-0'}`} />
          </button>
          <span className="text-xs text-text-muted">{LABELS[type]}</span>
        </label>
      ))}
      <button onClick={onClose} className="mt-1 text-[10px] text-text-subtle text-right">Done</button>
    </div>
  )
}

// ---- Main component ---------------------------------------------------------

interface NudgesProps {
  stats: DailyStats | null
  logEntries: LogEntry[]
  injuries: InjuryWithCheckins[]
}

export function Nudges({ stats, logEntries, injuries }: NudgesProps) {
  const { settings, toggle } = useNudgeSettings()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)

  const allNudges = computeNudges(stats, logEntries, injuries, settings)
  const visible = allNudges.filter((n) => !dismissed.has(n.id))

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {visible.map((nudge) => (
        <div
          key={nudge.id}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid rgba(139,92,246,0.18)',
          }}
        >
          <span className="text-accent text-sm shrink-0">◆</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text leading-snug">{nudge.headline}</p>
            {nudge.sub && <p className="text-xs text-text-muted mt-0.5">{nudge.sub}</p>}
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, nudge.id]))}
            className="shrink-0 text-text-subtle hover:text-text transition-colors text-base leading-none px-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}

      {/* Settings gear */}
      <div className="relative flex justify-end">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-text-muted transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Reminder settings
        </button>
        {showSettings && (
          <SettingsPopover
            settings={settings}
            onToggle={toggle}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  )
}
