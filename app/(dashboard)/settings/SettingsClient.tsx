'use client'

import { useState } from 'react'
import { saveSettings, generateToken, addPlace, removePlace, changeEmail, changePassword } from './actions'
import { useTheme } from '@/components/ThemeProvider'
import type { SavedPlace } from '@/lib/db/preferences'
import type { Theme } from '@/components/ThemeProvider'

interface Props {
  userId: string
  currentEmail: string
  initialPrefs: {
    weightGoal: number | null
    token: string | null
    savedPlaces: SavedPlace[]
    mounjaroEnabled: boolean
    theme: string
  }
  whoopConnection: {
    displayName: string | null
    lastSyncAt: string | null
  } | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  )
}

const THEMES: { id: Theme; label: string; desc: string; preview: string }[] = [
  { id: 'normal',        label: 'Normal',          desc: 'Deep violet on dark slate',     preview: '#111113/#8b5cf6' },
  { id: 'hacker',        label: 'Hacker',           desc: 'Green phosphor · monospace',    preview: '#000000/#00ff41' },
  { id: 'brutalism',     label: 'Modern Brutalism', desc: 'Black on white · raw energy',   preview: '#ffffff/#000000' },
  { id: 'old-money',     label: 'Old Money',        desc: 'Deep green · gold accents',     preview: '#0f1a08/#c9a84c' },
  { id: 'dark-academia', label: 'Dark Academia',    desc: 'Warm brown · candle amber',     preview: '#13100a/#d4930a' },
]

export function SettingsClient({ currentEmail, initialPrefs, whoopConnection }: Props) {
  const [weightGoal, setWeightGoal] = useState(initialPrefs.weightGoal?.toString() ?? '')
  const [mounjaroEnabled, setMounjaroEnabled] = useState(initialPrefs.mounjaroEnabled)
  const [token, setToken] = useState(initialPrefs.token)
  const { theme, setTheme } = useTheme()
  const [places, setPlaces] = useState<SavedPlace[]>(initialPrefs.savedPlaces)
  const [newPlaceName, setNewPlaceName] = useState('')
  const [newPlaceAction, setNewPlaceAction] = useState('')
  const [newPlaceLog, setNewPlaceLog] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ ok?: boolean; pending?: boolean; msg?: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<{ ok?: boolean; msg?: string } | null>(null)

  const [whoop, setWhoop] = useState(whoopConnection)
  const [whoopSyncing, setWhoopSyncing] = useState(false)
  const [whoopSyncMsg, setWhoopSyncMsg] = useState<string | null>(null)
  const [whoopDisconnecting, setWhoopDisconnecting] = useState(false)

  async function handleWhoopSync() {
    setWhoopSyncing(true)
    setWhoopSyncMsg(null)
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' })
      let data: Record<string, unknown> = {}
      try { data = await res.json() } catch { /* non-JSON body */ }

      setWhoopSyncing(false)
      if (!res.ok || data.error) {
        setWhoopSyncMsg(`Error: ${String(data.error ?? `HTTP ${res.status}`)}`)
      } else {
        const synced = (data.synced as number) ?? 0
        const workouts = (data.workouts_synced as number) ?? 0
        const slps = (data.sleeps_synced as number) ?? 0
        const errors = (data.upsert_errors as unknown[])?.length ?? 0
        const parts = [`${synced} day${synced === 1 ? '' : 's'}`]
        if (workouts > 0) parts.push(`${workouts} workout${workouts === 1 ? '' : 's'}`)
        if (slps > 0) parts.push(`${slps} sleep${slps === 1 ? '' : 's'}`)
        if (data.skipped_open) parts.push(`${data.skipped_open} open`)
        if (errors > 0) {
          const firstErr = (data.upsert_errors as Array<{date: string; error: string}>)[0]
          parts.push(`${errors} error${errors > 1 ? 's' : ''}: ${firstErr?.error}`)
        }
        setWhoopSyncMsg(`Synced · ${parts.join(' · ')}`)
        setWhoop(w => w ? { ...w, lastSyncAt: new Date().toISOString() } : w)
        // Only auto-clear if there were no errors — keep errors visible until next action
        if (errors === 0) setTimeout(() => setWhoopSyncMsg(null), 6000)
      }
    } catch (err) {
      setWhoopSyncing(false)
      setWhoopSyncMsg(`Error: ${err instanceof Error ? err.message : 'Network failure'}`)
    }
  }

  async function handleWhoopDisconnect() {
    setWhoopDisconnecting(true)
    await fetch('/api/whoop/disconnect', { method: 'POST' })
    setWhoopDisconnecting(false)
    setWhoop(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await saveSettings({
      weight_goal_kg: weightGoal ? parseFloat(weightGoal) : null,
      mounjaro_enabled: mounjaroEnabled,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleGenerateToken() {
    const t = await generateToken()
    setToken(t)
  }

  async function copyToken() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  async function handleAddPlace() {
    if (!newPlaceName || !newPlaceLog) return
    const place = await addPlace({
      name: newPlaceName,
      action: newPlaceAction || 'custom',
      log_text: newPlaceLog,
    })
    setPlaces((prev) => [...prev, place])
    setNewPlaceName('')
    setNewPlaceAction('')
    setNewPlaceLog('')
  }

  async function handleRemovePlace(id: string) {
    await removePlace(id)
    setPlaces((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleChangeEmail() {
    if (!newEmail.includes('@')) {
      setEmailStatus({ msg: 'Enter a valid email address' })
      return
    }
    if (newEmail !== confirmEmail) {
      setEmailStatus({ msg: 'Email addresses do not match' })
      return
    }
    setEmailSaving(true)
    setEmailStatus(null)
    const result = await changeEmail(newEmail)
    setEmailSaving(false)
    if (result.error) {
      setEmailStatus({ ok: false, msg: result.error })
    } else if (result.pending) {
      setEmailStatus({
        ok: true,
        pending: true,
        msg: 'Check your inbox — click the confirmation link to complete the change',
      })
      setNewEmail('')
      setConfirmEmail('')
    } else {
      setEmailStatus({ ok: true, msg: 'Email updated' })
      setNewEmail('')
      setConfirmEmail('')
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setPasswordStatus({ ok: false, msg: 'Password must be at least 8 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, msg: 'Passwords do not match' })
      return
    }
    setPasswordSaving(true)
    setPasswordStatus(null)
    const result = await changePassword(newPassword)
    setPasswordSaving(false)
    if (result.error) {
      setPasswordStatus({ ok: false, msg: result.error })
    } else {
      setPasswordStatus({ ok: true, msg: 'Password updated' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">Personal preferences and integrations</p>
      </div>

      {/* Health preferences */}
      <Section title="Health preferences">
        <div className="flex items-center gap-4">
          <label className="text-sm text-text-muted flex-1">Goal weight (kg)</label>
          <input
            type="number"
            value={weightGoal}
            onChange={(e) => setWeightGoal(e.target.value)}
            placeholder="e.g. 80"
            step="0.1"
            className="w-28 rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-1.5 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-text-muted">Mounjaro tracking</p>
            <p className="text-xs text-text-subtle">Show Mounjaro dose & side-effects widget</p>
          </div>
          <button
            role="switch"
            aria-checked={mounjaroEnabled}
            onClick={() => setMounjaroEnabled((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${mounjaroEnabled ? 'bg-accent' : 'bg-surface-elevated border border-border'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${mounjaroEnabled ? 'translate-x-4' : ''}`}
            />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <p className="text-xs text-text-subtle">Changes take effect immediately and are saved to your account.</p>
        <div className="flex flex-col gap-2">
          {THEMES.map((t) => {
            const [bg, accent] = t.preview.split('/')
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as Theme)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  background: active ? 'var(--accent-dim)' : 'var(--surface-elevated)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {/* Colour swatch */}
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: bg, border: `2px solid ${accent}` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{t.label}</p>
                  <p className="text-xs text-text-subtle">{t.desc}</p>
                </div>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* WHOOP */}
      <Section title="WHOOP Integration">
        {whoop ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-surface-elevated border border-border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">
                  {whoop.displayName ?? 'Connected'}
                </p>
                <p className="text-xs text-text-subtle">
                  {whoop.lastSyncAt
                    ? `Last synced ${new Date(whoop.lastSyncAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Never synced'}
                </p>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--positive)', color: '#000', opacity: 0.85 }}
              >
                Connected
              </span>
            </div>
            {whoopSyncMsg && (
              <p className={`text-xs ${whoopSyncMsg.startsWith('Error') ? 'text-negative' : 'text-positive'}`}>
                {whoopSyncMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleWhoopSync}
                disabled={whoopSyncing}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {whoopSyncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={handleWhoopDisconnect}
                disabled={whoopDisconnecting}
                className="px-4 py-1.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-muted hover:text-negative disabled:opacity-50 transition-colors"
              >
                {whoopDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted leading-relaxed">
              Connect your WHOOP strap to pull recovery scores, HRV, resting heart rate, strain, and sleep performance into Parma.
            </p>
            <a
              href="/api/whoop/connect"
              className="self-start px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Connect WHOOP
            </a>
          </div>
        )}
      </Section>

      {/* Apple Shortcuts */}
      <Section title="Apple Shortcuts — Location Logging">
        <p className="text-sm text-text-muted leading-relaxed">
          Log to Parma automatically when you arrive somewhere. Generate an API token, set up an iPhone Shortcut, and Parma will parse and save your log just like a manual entry.
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-subtle uppercase tracking-widest">API Token</p>
          {token ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-surface-elevated rounded-lg px-3 py-2 text-text-muted font-mono truncate border border-border">
                {token}
              </code>
              <button
                onClick={copyToken}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-text-muted hover:text-text transition-colors"
              >
                {tokenCopied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleGenerateToken}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-text-muted hover:text-text transition-colors"
              >
                Regen
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateToken}
              className="self-start px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Generate token
            </button>
          )}
        </div>

        {token && (
          <div className="rounded-xl bg-surface-elevated border border-border p-4 flex flex-col gap-3 text-xs text-text-muted">
            <p className="font-semibold text-text text-sm">iPhone Shortcuts setup</p>
            <ol className="flex flex-col gap-1.5 pl-3 list-decimal marker:text-text-subtle" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
              <li>Open the <strong className="text-text">Shortcuts</strong> app on your iPhone</li>
              <li>Tap <strong className="text-text">+</strong> → add action → search <strong className="text-text">Get Contents of URL</strong></li>
              <li>Set URL to: <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">https://parma-seven.vercel.app/api/shortcuts/log</code></li>
              <li>Set Method to <strong className="text-text">POST</strong></li>
              <li>Add Header: <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">Authorization</code> → <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">Bearer {token}</code></li>
              <li>Set Request Body to <strong className="text-text">JSON</strong> with key <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">text</code> = your log message</li>
              <li>Add an <strong className="text-text">Automation</strong> → <strong className="text-text">Arrive</strong> at a location → run this shortcut</li>
            </ol>
          </div>
        )}

        {/* Saved places */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-subtle uppercase tracking-widest">Saved places</p>
          {places.length === 0 && (
            <p className="text-sm text-text-subtle">No places yet — add one below.</p>
          )}
          {places.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-elevated border border-border px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{p.name}</p>
                <p className="text-xs text-text-subtle truncate">"{p.log_text}"</p>
              </div>
              <button
                onClick={() => handleRemovePlace(p.id)}
                className="text-text-subtle hover:text-negative transition-colors text-base leading-none px-1"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add place form */}
          <div className="flex flex-col gap-2 pt-1">
            <input
              type="text"
              placeholder="Place name (e.g. Gym)"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
            />
            <input
              type="text"
              placeholder="Auto-log text (e.g. arrived at gym, ready to train)"
              value={newPlaceLog}
              onChange={(e) => setNewPlaceLog(e.target.value)}
              className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
            />
            <button
              onClick={handleAddPlace}
              disabled={!newPlaceName || !newPlaceLog}
              className="self-start px-4 py-1.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-muted hover:text-text disabled:opacity-40 transition-colors"
            >
              Add place
            </button>
          </div>
        </div>
      </Section>

      {/* Change email */}
      <Section title="Change email">
        <p className="text-xs text-text-subtle">
          Current: <span className="text-text-muted">{currentEmail}</span>
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            autoComplete="email"
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
          />
          <input
            type="email"
            placeholder="Confirm new email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            autoComplete="email"
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
          />
          {emailStatus && (
            <p className={`text-xs ${emailStatus.ok ? 'text-positive' : 'text-negative'}`}>
              {emailStatus.msg}
            </p>
          )}
          <button
            onClick={handleChangeEmail}
            disabled={emailSaving || !newEmail || !confirmEmail}
            className="self-start px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {emailSaving ? 'Updating…' : 'Update email'}
          </button>
        </div>
      </Section>

      {/* Change password */}
      <Section title="Change password">
        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
          />
          {passwordStatus && (
            <p className={`text-xs ${passwordStatus.ok ? 'text-positive' : 'text-negative'}`}>
              {passwordStatus.msg}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="self-start px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </Section>
    </div>
  )
}
