'use client'

import { useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { compressImage } from '@/lib/wardrobeImage'
import type { WardrobeItemWithStats, WardrobeType, Season, WardrobeCondition } from '@/lib/wardrobeTypes'

const TYPES: WardrobeType[] = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'underwear', 'activewear', 'other']
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
const CONDITIONS: WardrobeCondition[] = ['new', 'excellent', 'good', 'fair', 'worn']

interface DraftFields {
  name: string
  type: WardrobeType
  colours: string
  brand: string
  size: string
  seasons: Season[]
  tags: string
  condition: WardrobeCondition | ''
  price_paid: string
  acquired_on: string
  notes: string
}

const EMPTY_DRAFT: DraftFields = {
  name: '', type: 'top', colours: '', brand: '', size: '', seasons: [], tags: '',
  condition: '', price_paid: '', acquired_on: '', notes: '',
}

export function AddItemFlow({ open, onOpenChange, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (item: WardrobeItemWithStats) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'pick' | 'analyzing' | 'confirm'>('pick')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState<string | null>(null)

  function reset() {
    setMode('pick')
    setPhotoBlob(null)
    setPhotoPreview(null)
    setDraft(EMPTY_DRAFT)
    setError(null)
    setAiNote(null)
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  async function handlePhoto(file: File) {
    setError(null)
    setMode('analyzing')
    try {
      const { base64, blob, mediaType } = await compressImage(file)
      setPhotoBlob(blob)
      setPhotoPreview(URL.createObjectURL(blob))

      const res = await fetch('/api/wardrobe/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const { proposed } = await res.json()

      setDraft({
        ...EMPTY_DRAFT,
        name: proposed.name ?? '',
        type: TYPES.includes(proposed.type) ? proposed.type : 'top',
        colours: (proposed.colours ?? []).join(', '),
        brand: proposed.brand ?? '',
        seasons: (proposed.seasons ?? []).filter((s: string) => SEASONS.includes(s as Season)),
        tags: (proposed.tags ?? []).join(', '),
      })
      setAiNote('Proposed by AI from your photo — review and edit before saving.')
      setMode('confirm')
    } catch {
      setError('Could not analyze the photo — you can still fill in the details manually below.')
      setMode('confirm')
    }
  }

  function startManual() {
    reset()
    setMode('confirm')
  }

  function toggleSeason(s: Season) {
    setDraft((d) => ({
      ...d,
      seasons: d.seasons.includes(s) ? d.seasons.filter((x) => x !== s) : [...d.seasons, s],
    }))
  }

  async function save() {
    if (!draft.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const fields = {
        name: draft.name.trim(),
        type: draft.type,
        colours: draft.colours.split(',').map((c) => c.trim()).filter(Boolean),
        brand: draft.brand.trim() || null,
        size: draft.size.trim() || null,
        seasons: draft.seasons,
        tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
        condition: draft.condition || null,
        price_paid: draft.price_paid ? Number(draft.price_paid) : null,
        acquired_on: draft.acquired_on || null,
        notes: draft.notes.trim() || null,
      }
      const formData = new FormData()
      formData.set('data', JSON.stringify(fields))
      if (photoBlob) formData.set('photo', photoBlob, 'item.jpg')

      const res = await fetch('/api/wardrobe', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Save failed')
      const { item } = await res.json()
      onSaved(item)
      close()
    } catch {
      setError('Failed to save item — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())} title="Add clothing item">
      {mode === 'pick' && (
        <div className="flex flex-col gap-3 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            📷 Take or choose a photo
          </button>
          <button
            onClick={startManual}
            className="rounded-xl py-3 text-sm font-medium text-text-muted border border-border hover:bg-surface-hover"
          >
            Enter details manually
          </button>
        </div>
      )}

      {mode === 'analyzing' && (
        <div className="flex flex-col items-center gap-3 py-10">
          {photoPreview && (
            <img src={photoPreview} alt="" className="w-32 h-32 object-cover rounded-xl border border-border" />
          )}
          <p className="text-sm text-text-muted">Analyzing photo…</p>
        </div>
      )}

      {mode === 'confirm' && (
        <div className="flex flex-col gap-3 pb-4">
          {photoPreview && (
            <img src={photoPreview} alt="" className="w-full max-h-56 object-cover rounded-xl border border-border" />
          )}
          {aiNote && <p className="text-xs text-accent">{aiNote}</p>}
          {error && <p className="text-xs text-negative">{error}</p>}

          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              placeholder="e.g. Grey zip-up hoodie"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Type
            <select
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as WardrobeType }))}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Colours (comma-separated)
              <input
                value={draft.colours}
                onChange={(e) => setDraft((d) => ({ ...d, colours: e.target.value }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
                placeholder="grey, black"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Brand
              <input
                value={draft.brand}
                onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Size
              <input
                value={draft.size}
                onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Condition
              <select
                value={draft.condition}
                onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value as WardrobeCondition }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              >
                <option value="">—</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1 text-xs text-text-muted">
            Seasons
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSeason(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    draft.seasons.includes(s)
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'border-border text-text-subtle hover:bg-surface-hover'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Tags (comma-separated)
            <input
              value={draft.tags}
              onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              placeholder="casual, gym"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Price paid (£)
              <input
                type="number" step="0.01" min="0"
                value={draft.price_paid}
                onChange={(e) => setDraft((d) => ({ ...d, price_paid: e.target.value }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Acquired on
              <input
                type="date"
                value={draft.acquired_on}
                onChange={(e) => setDraft((d) => ({ ...d, acquired_on: e.target.value }))}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Notes
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-none"
            />
          </label>

          <button
            onClick={save}
            disabled={saving}
            className="mt-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Saving…' : 'Save item'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
