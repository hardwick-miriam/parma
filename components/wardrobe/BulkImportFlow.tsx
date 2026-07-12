'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { compressImage } from '@/lib/wardrobeImage'
import type { WardrobeItemWithStats, WardrobeType, Season } from '@/lib/wardrobeTypes'

const TYPES: WardrobeType[] = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'underwear', 'activewear', 'other']
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// A folder-import pulls in every file in the directory, not just images (no
// `accept` filtering applies to webkitdirectory), so this needs its own
// filter — but HEIC/HEIF files picked via a folder input frequently report
// an empty or generic MIME type (same issue documented in wardrobeImage.ts),
// so a plain `file.type.startsWith('image/')` check silently drops exactly
// the photos the HEIC-conversion path was built to handle. Fall back to the
// file extension when the MIME type is inconclusive.
function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.name)
}

interface BulkFields {
  name: string
  type: WardrobeType
  colours: string
  brand: string
  seasons: Season[]
  tags: string
  size: string
  condition: string
  price_paid: string
  acquired_on: string
  notes: string
}

interface BulkItem {
  tempId: string
  fileName: string
  cutoutBase64: string
  cutoutMediaType: 'image/png' | 'image/jpeg'
  bgRemoved: boolean
  processingError: string | null
  fields: BulkFields
  needsReview: string[]
  isDuplicate: boolean
  duplicateOf: string | null
  selected: boolean
}

function emptyFields(): BulkFields {
  return { name: '', type: 'other', colours: '', brand: '', seasons: [], tags: '', size: '', condition: '', price_paid: '', acquired_on: '', notes: '' }
}

function normaliseColour(c: string) {
  return c.trim().toLowerCase()
}

export function BulkImportFlow({ open, onClose, onSaved }: {
  open: boolean
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'pick' | 'processing' | 'review'>('pick')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [items, setItems] = useState<BulkItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [bulkSeason, setBulkSeason] = useState<Season | ''>('')
  const [bulkType, setBulkType] = useState<WardrobeType | ''>('')
  const [bulkBrand, setBulkBrand] = useState('')
  const [bulkTag, setBulkTag] = useState('')

  if (!open) return null

  function reset() {
    setMode('pick')
    setProgress({ done: 0, total: 0 })
    setItems([])
    setExpandedId(null)
  }

  function closeAll() {
    reset()
    onClose()
  }

  async function processFiles(files: File[]) {
    if (!files.length) return
    setMode('processing')
    setProgress({ done: 0, total: files.length })

    // Fetch the full unfiltered existing wardrobe once, for duplicate detection.
    let existing: WardrobeItemWithStats[] = []
    try {
      const res = await fetch('/api/wardrobe?sort=newest')
      if (res.ok) existing = (await res.json()).items ?? []
    } catch {
      // Duplicate detection degrades to "batch-internal only" — not fatal.
    }

    const processed: BulkItem[] = []

    for (const file of files) {
      const tempId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      try {
        const { base64, mediaType } = await compressImage(file)
        const res = await fetch('/api/wardrobe/bulk-import/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })
        if (!res.ok) throw new Error('Processing failed')
        const data = await res.json()
        const proposed = data.proposed ?? {}
        const type: WardrobeType = TYPES.includes(proposed.type) ? proposed.type : 'other'
        const colours = (proposed.colours ?? []).join(', ')
        const brand = proposed.brand ?? ''

        processed.push({
          tempId,
          fileName: file.name,
          cutoutBase64: data.cutoutBase64,
          cutoutMediaType: data.cutoutMediaType ?? 'image/png',
          bgRemoved: !!data.bgRemoved,
          processingError: data.analysisFailed ? 'AI analysis failed — fill in fields manually' : null,
          fields: {
            ...emptyFields(),
            name: proposed.name ?? '',
            type,
            colours,
            brand,
            seasons: (proposed.seasons ?? []).filter((s: string) => SEASONS.includes(s as Season)),
            tags: (proposed.tags ?? []).join(', '),
          },
          needsReview: data.needsReview ?? [],
          isDuplicate: false,
          duplicateOf: null,
          selected: false,
        })
      } catch {
        processed.push({
          tempId,
          fileName: file.name,
          cutoutBase64: '',
          cutoutMediaType: 'image/jpeg',
          bgRemoved: false,
          processingError: 'Could not process this photo — fill in fields manually or remove it',
          fields: emptyFields(),
          needsReview: ['name', 'type', 'colours', 'brand', 'seasons', 'tags'],
          isDuplicate: false,
          duplicateOf: null,
          selected: false,
        })
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    // Duplicate detection: same type + brand (or type + first colour if no brand),
    // against both existing wardrobe items and earlier items already in this batch.
    const seenKeys = new Map<string, string>() // key -> name
    for (const ex of existing) {
      const key = `${ex.type}|${(ex.brand ?? '').toLowerCase()}|${normaliseColour(ex.colours[0] ?? '')}`
      seenKeys.set(key, ex.name)
    }
    for (const item of processed) {
      const firstColour = normaliseColour(item.fields.colours.split(',')[0] ?? '')
      const key = `${item.fields.type}|${item.fields.brand.toLowerCase()}|${firstColour}`
      const match = seenKeys.get(key)
      if (match) {
        item.isDuplicate = true
        item.duplicateOf = match
      } else {
        seenKeys.set(key, item.fields.name || item.fileName)
      }
    }

    setItems(processed)
    setMode('review')
  }

  function updateItem(tempId: string, patch: Partial<BulkFields>) {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, fields: { ...it.fields, ...patch } } : it)))
  }

  function toggleSelected(tempId: string) {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, selected: !it.selected } : it)))
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId))
  }

  const selectedCount = items.filter((i) => i.selected).length

  function applyBulkEdits() {
    setItems((prev) => prev.map((it) => {
      if (!it.selected) return it
      const fields = { ...it.fields }
      if (bulkSeason) fields.seasons = fields.seasons.includes(bulkSeason) ? fields.seasons : [...fields.seasons, bulkSeason]
      if (bulkType) fields.type = bulkType
      if (bulkBrand.trim()) fields.brand = bulkBrand.trim()
      if (bulkTag.trim()) {
        const existingTags = fields.tags.split(',').map((t) => t.trim()).filter(Boolean)
        if (!existingTags.includes(bulkTag.trim())) fields.tags = [...existingTags, bulkTag.trim()].join(', ')
      }
      return { ...it, fields }
    }))
    setBulkSeason('')
    setBulkType('')
    setBulkBrand('')
    setBulkTag('')
  }

  async function confirmAll() {
    const withNames = items.filter((i) => i.fields.name.trim())
    if (withNames.length === 0) {
      toast.error('Every item needs at least a name before saving')
      return
    }
    if (withNames.length < items.length) {
      toast.error(`${items.length - withNames.length} item(s) still need a name — fix or remove them first`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        items: items.map((it) => ({
          fields: {
            name: it.fields.name.trim(),
            type: it.fields.type,
            colours: it.fields.colours.split(',').map((c) => c.trim()).filter(Boolean),
            brand: it.fields.brand.trim() || null,
            size: it.fields.size.trim() || null,
            seasons: it.fields.seasons,
            tags: it.fields.tags.split(',').map((t) => t.trim()).filter(Boolean),
            condition: it.fields.condition || null,
            price_paid: it.fields.price_paid ? Number(it.fields.price_paid) : null,
            acquired_on: it.fields.acquired_on || null,
            notes: it.fields.notes.trim() || null,
          },
          imageBase64: it.cutoutBase64,
          imageMediaType: it.cutoutMediaType,
        })),
      }
      const res = await fetch('/api/wardrobe/bulk-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Batch save failed')
      const data = await res.json()
      if (data.failedCount > 0) {
        toast.error(`${data.savedCount} saved, ${data.failedCount} failed: ${data.failed.map((f: { name: string }) => f.name).join(', ')}`)
      } else {
        toast.success(`${data.savedCount} item${data.savedCount === 1 ? '' : 's'} added to your wardrobe`)
      }
      onSaved(data.savedCount)
      if (data.failedCount === 0) closeAll()
      else setItems((prev) => prev.filter((it, i) => data.failed.some((f: { index: number }) => f.index === i)))
    } catch {
      toast.error('Failed to save the batch — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-4 sm:px-6 pt-6 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-text">Bulk import</h2>
        <button onClick={closeAll} aria-label="Close" className="text-text-subtle hover:text-text transition-colors text-2xl leading-none w-11 h-11 flex items-center justify-center">×</button>
      </div>

      {mode === 'pick' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            // @ts-expect-error webkitdirectory isn't in React's HTML attribute types but is a real, well-supported desktop-browser attribute
            webkitdirectory=""
            className="hidden"
            onChange={(e) => e.target.files && processFiles(Array.from(e.target.files).filter(isLikelyImageFile))}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl py-4 px-8 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            📷 Choose photos
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="rounded-xl py-3 px-8 text-sm font-medium text-text-muted border border-border hover:bg-surface-hover"
          >
            📁 Import a folder (desktop)
          </button>
          <p className="text-xs text-text-subtle text-center max-w-xs">
            Each photo gets its background removed and is identified automatically — you'll review everything before it saves.
          </p>
        </div>
      )}

      {mode === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-full max-w-xs h-2 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="text-sm text-text-muted">Processing {progress.done} of {progress.total}…</p>
        </div>
      )}

      {mode === 'review' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Locks every per-item control (inputs, checkboxes, remove buttons) while a
              save is in flight — confirmAll()'s partial-failure reconciliation matches
              failed items back to the array by index, which a concurrent edit/removal
              could otherwise desync. `display: contents` keeps the fieldset out of the
              grid/flex layout entirely, so it's purely a disable boundary, not a box. */}
          <fieldset disabled={saving} style={{ display: 'contents' }}>
          {selectedCount > 0 && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-surface-elevated border-b border-accent/40 px-4 sm:px-6 py-2.5">
              <span className="text-sm font-semibold text-text">{selectedCount} selected</span>
              <select value={bulkType} onChange={(e) => setBulkType(e.target.value as WardrobeType)} className="text-xs rounded-lg bg-surface border border-border text-text px-2 py-1.5">
                <option value="">Set type…</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={bulkSeason} onChange={(e) => setBulkSeason(e.target.value as Season)} className="text-xs rounded-lg bg-surface border border-border text-text px-2 py-1.5">
                <option value="">Add season…</option>
                {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)} placeholder="Set brand…" className="text-xs w-28 rounded-lg bg-surface border border-border text-text px-2 py-1.5" />
              <input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Add tag…" className="text-xs w-24 rounded-lg bg-surface border border-border text-text px-2 py-1.5" />
              <button onClick={applyBulkEdits} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'var(--accent)' }}>Apply</button>
            </div>
          )}

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const expanded = expandedId === item.tempId
              return (
                <div key={item.tempId} className={`rounded-2xl border bg-surface p-3 flex flex-col gap-2 ${item.isDuplicate ? 'border-warning' : 'border-border'}`}>
                  <div className="flex gap-2">
                    <input type="checkbox" checked={item.selected} onChange={() => toggleSelected(item.tempId)} className="mt-1 w-4 h-4 shrink-0 accent-[var(--accent)]" />
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-elevated shrink-0 border border-border">
                      {item.cutoutBase64 ? (
                        <img src={`data:${item.cutoutMediaType};base64,${item.cutoutBase64}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <input
                        value={item.fields.name}
                        onChange={(e) => updateItem(item.tempId, { name: e.target.value })}
                        placeholder="Name"
                        className={`w-full rounded-lg bg-surface-elevated border text-text text-sm px-2 py-1 focus:outline-none focus:border-accent ${item.needsReview.includes('name') ? 'border-warning' : 'border-border'}`}
                      />
                      <select
                        value={item.fields.type}
                        onChange={(e) => updateItem(item.tempId, { type: e.target.value as WardrobeType })}
                        className={`w-full rounded-lg bg-surface-elevated border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent ${item.needsReview.includes('type') ? 'border-warning' : 'border-border'}`}
                      >
                        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {!item.bgRemoved && item.cutoutBase64 && (
                    <p className="text-[10px] text-warning">Background removal failed — using original photo</p>
                  )}
                  {item.processingError && <p className="text-[10px] text-negative">{item.processingError}</p>}
                  {item.isDuplicate && (
                    <p className="text-[10px] text-warning">Possible duplicate of "{item.duplicateOf}" — check before saving</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.fields.colours}
                      onChange={(e) => updateItem(item.tempId, { colours: e.target.value })}
                      placeholder="Colours"
                      className={`rounded-lg bg-surface-elevated border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent ${item.needsReview.includes('colours') ? 'border-warning' : 'border-border'}`}
                    />
                    <input
                      value={item.fields.brand}
                      onChange={(e) => updateItem(item.tempId, { brand: e.target.value })}
                      placeholder="Brand"
                      className={`rounded-lg bg-surface-elevated border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent ${item.needsReview.includes('brand') ? 'border-warning' : 'border-border'}`}
                    />
                  </div>

                  <div className={`flex flex-wrap gap-1 ${item.needsReview.includes('seasons') ? 'ring-1 ring-warning rounded-lg p-1' : ''}`}>
                    {SEASONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateItem(item.tempId, {
                          seasons: item.fields.seasons.includes(s) ? item.fields.seasons.filter((x) => x !== s) : [...item.fields.seasons, s],
                        })}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                          item.fields.seasons.includes(s) ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-subtle'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <input
                    value={item.fields.tags}
                    onChange={(e) => updateItem(item.tempId, { tags: e.target.value })}
                    placeholder="Tags (comma-separated)"
                    className={`rounded-lg bg-surface-elevated border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent ${item.needsReview.includes('tags') ? 'border-warning' : 'border-border'}`}
                  />

                  {expanded && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                      <input value={item.fields.size} onChange={(e) => updateItem(item.tempId, { size: e.target.value })} placeholder="Size" className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2 py-1" />
                      <input value={item.fields.condition} onChange={(e) => updateItem(item.tempId, { condition: e.target.value })} placeholder="Condition" className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2 py-1" />
                      <input type="number" step="0.01" value={item.fields.price_paid} onChange={(e) => updateItem(item.tempId, { price_paid: e.target.value })} placeholder="Price paid" className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2 py-1" />
                      <input type="date" value={item.fields.acquired_on} onChange={(e) => updateItem(item.tempId, { acquired_on: e.target.value })} className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2 py-1" />
                      <textarea value={item.fields.notes} onChange={(e) => updateItem(item.tempId, { notes: e.target.value })} placeholder="Notes" rows={2} className="col-span-2 rounded-lg bg-surface-elevated border border-border text-text text-xs px-2 py-1 resize-none" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button onClick={() => setExpandedId(expanded ? null : item.tempId)} className="text-[11px] text-accent hover:opacity-80 py-2.5 px-1 -my-2.5 -mx-1">
                      {expanded ? 'Less' : 'More fields'}
                    </button>
                    <button onClick={() => removeItem(item.tempId)} className="text-[11px] text-negative hover:opacity-80 py-2.5 px-1 -my-2.5 -mx-1">
                      Remove from batch
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          </fieldset>

          {items.length === 0 ? (
            <p className="text-sm text-text-subtle text-center py-10">Every photo was removed from the batch.</p>
          ) : (
            <div className="sticky bottom-0 border-t border-border bg-surface p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-text-subtle">{items.length} item{items.length === 1 ? '' : 's'} ready</p>
              <button
                onClick={confirmAll}
                disabled={saving}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? 'Saving…' : `Confirm all ${items.length}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
