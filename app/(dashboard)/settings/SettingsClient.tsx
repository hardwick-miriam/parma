'use client'

import { useState } from 'react'
import { saveSettings, generateToken, addPlace, removePlace } from './actions'
import type { SavedPlace } from '@/lib/db/preferences'

interface Props {
  userId: string
  initialPrefs: {
    weightGoal: number | null
    token: string | null
    savedPlaces: SavedPlace[]
    mounjaroEnabled: boolean
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  )
}

export function SettingsClient({ initialPrefs }: Props) {
  const [weightGoal, setWeightGoal] = useState(initialPrefs.weightGoal?.toString() ?? '')
  const [mounjaroEnabled, setMounjaroEnabled] = useState(initialPrefs.mounjaroEnabled)
  const [token, setToken] = useState(initialPrefs.token)
  const [places, setPlaces] = useState<SavedPlace[]>(initialPrefs.savedPlaces)
  const [newPlaceName, setNewPlaceName] = useState('')
  const [newPlaceAction, setNewPlaceAction] = useState('')
  const [newPlaceLog, setNewPlaceLog] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

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
    </div>
  )
}
