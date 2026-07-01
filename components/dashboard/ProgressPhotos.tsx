'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Photo {
  id: string
  photo_date: string
  url: string | null
  created_at: string
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

export function ProgressPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('photo', file)
    form.append('date', new Date().toISOString().split('T')[0])
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setPhotos((prev) => [data.photo, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null)
    setLightbox(null)
    try {
      await fetch(`/api/photos?id=${id}`, { method: 'DELETE' })
      setPhotos((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('Delete failed')
    }
  }

  return (
    <>
      {/* Compact bento card — fixed height to match row */}
      <div
        className="rounded-2xl bg-surface border border-border overflow-hidden flex flex-col h-[180px]"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Photos</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 disabled:opacity-50 transition-colors"
          >
            <PlusIcon />
            {uploading ? '…' : 'Add'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

        {error && <p className="text-[10px] text-negative px-4 pb-1 shrink-0">{error}</p>}

        {/* Body */}
        {loading ? (
          <div className="flex gap-2 px-4 pb-4 flex-1 items-end">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[72px] h-[100px] rounded-xl bg-surface-elevated animate-pulse shrink-0" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-2 text-text-subtle hover:text-text-muted transition-colors pb-2"
          >
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs">Add your first photo</p>
          </button>
        ) : (
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto flex-1 items-end" style={{ scrollbarWidth: 'none' }}>
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="shrink-0 flex flex-col items-center gap-1 focus:outline-none"
              >
                <div className="w-[72px] h-[100px] rounded-xl overflow-hidden bg-surface-elevated border border-border">
                  {photo.url ? (
                    <img src={photo.url} alt={fmtDate(photo.photo_date)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-subtle text-[10px]">?</div>
                  )}
                </div>
                <p className="text-[10px] text-text-subtle">{fmtDate(photo.photo_date)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox portal */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 9999 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setLightbox(null); setConfirmDelete(null) }}
          >
            <div className="absolute inset-0 bg-black/85" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
            <div className="relative z-10 flex flex-col items-center gap-3 p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm text-white/70">{fmtDate(lightbox.photo_date)}</p>
              {lightbox.url && (
                <img src={lightbox.url} alt="Progress" className="rounded-2xl max-h-[72dvh] w-auto object-contain" />
              )}
              <div className="flex gap-3">
                {confirmDelete === lightbox.id ? (
                  <>
                    <button onClick={() => handleDelete(lightbox.id)} className="text-xs text-negative border border-negative/40 px-3 py-1.5 rounded-lg">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-text-muted border border-border px-3 py-1.5 rounded-lg">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmDelete(lightbox.id)} className="text-xs text-text-muted border border-border px-3 py-1.5 rounded-lg hover:text-negative transition-colors">Delete</button>
                    <button onClick={() => setLightbox(null)} className="text-xs text-white/60 border border-white/20 px-3 py-1.5 rounded-lg hover:text-white transition-colors">Close</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
