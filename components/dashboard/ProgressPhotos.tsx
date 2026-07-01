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
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      .catch(() => setError('Failed to load photos'))
      .finally(() => setLoading(false))
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]
    const form = new FormData()
    form.append('photo', file)
    form.append('date', today)

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
    try {
      await fetch(`/api/photos?id=${id}`, { method: 'DELETE' })
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      if (lightbox?.id === id) setLightbox(null)
    } catch {
      setError('Delete failed')
    }
  }

  if (!loading && photos.length === 0 && !error) {
    return (
      <div
        className="rounded-2xl bg-surface border border-border p-5 flex items-center justify-between gap-4"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-1">Progress Photos</h2>
          <p className="text-sm text-text-subtle">Track your physique over time — no AI, just storage.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <PlusIcon />
          {uploading ? 'Uploading…' : 'Add photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      </div>
    )
  }

  return (
    <>
      <div
        className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Progress Photos</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 disabled:opacity-50 transition-colors"
          >
            <PlusIcon />
            {uploading ? 'Uploading…' : 'Add'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

        {error && <p className="text-xs text-negative">{error}</p>}

        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24 h-32 rounded-xl bg-surface-elevated animate-pulse shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {photos.map((photo) => (
              <div key={photo.id} className="relative shrink-0 group">
                <button
                  onClick={() => setLightbox(photo)}
                  className="block w-24 h-32 rounded-xl overflow-hidden bg-surface-elevated border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={`Progress photo ${fmtDate(photo.photo_date)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-subtle text-xs">
                      No preview
                    </div>
                  )}
                </button>
                <p className="text-[10px] text-text-subtle text-center mt-1">{fmtDate(photo.photo_date)}</p>

                {/* Delete button */}
                {confirmDelete === photo.id ? (
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="text-[10px] bg-negative text-white px-1.5 py-0.5 rounded font-medium"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[10px] bg-surface-elevated text-text-muted px-1.5 py-0.5 rounded font-medium"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(photo.id) }}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete photo"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 9999 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <div
              className="absolute inset-0 bg-black/85"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            />
            <div className="relative z-10 flex flex-col items-center gap-3 p-4 max-w-lg w-full">
              <p className="text-sm text-white/70">{fmtDate(lightbox.photo_date)}</p>
              {lightbox.url && (
                <img
                  src={lightbox.url}
                  alt="Progress"
                  className="rounded-2xl max-h-[75dvh] w-auto object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <button
                onClick={() => setLightbox(null)}
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
