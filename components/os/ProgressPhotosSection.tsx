'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getLocalDate } from '@/lib/date'
import { LottieEmpty } from '@/components/ui/LottieEmpty'

interface Photo {
  id: string
  photo_date: string
  url: string | null
  created_at: string
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PhotosSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[100px] h-[140px] rounded-xl bg-surface-elevated animate-pulse shrink-0" />
      ))}
    </div>
  )
}

export function ProgressPhotosSection() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  const photosQuery = useQuery({
    queryKey: ['photos'],
    queryFn: async () => {
      const res = await fetch('/api/photos')
      if (!res.ok) throw new Error('Failed to load photos')
      return res.json() as Promise<{ photos: Photo[] }>
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('photo', file)
      form.append('date', getLocalDate())
      const res = await fetch('/api/photos', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    },
    onSuccess: () => { setUploadError(null); queryClient.invalidateQueries({ queryKey: ['photos'] }) },
    onError: (e) => setUploadError(e instanceof Error ? e.message : 'Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/photos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      setLightbox(null)
      setConfirmDelete(null)
    },
    onError: (e) => setUploadError(e instanceof Error ? e.message : 'Delete failed'),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    uploadMutation.mutate(file)
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  function exitCompareMode() {
    setCompareMode(false)
    setCompareIds([])
  }

  const photos = photosQuery.data?.photos ?? []
  const comparePhotos = compareIds.map((id) => photos.find((p) => p.id === id)).filter((p): p is Photo => !!p)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Progress photos</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text whitespace-nowrap"
          >
            {compareMode ? 'Done' : 'Compare'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'var(--accent)' }}
          >
            {uploadMutation.isPending ? 'Uploading…' : '+ Add photo'}
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {uploadError && <p className="text-xs text-negative">{uploadError}</p>}

      {compareMode && (
        <p className="text-[11px] text-text-subtle">
          {compareIds.length === 0 && 'Tap two photos to compare side-by-side.'}
          {compareIds.length === 1 && 'Tap one more photo.'}
          {compareIds.length === 2 && 'Showing comparison below — tap a photo to swap it out.'}
        </p>
      )}

      {photosQuery.isLoading ? (
        <PhotosSkeleton />
      ) : photosQuery.isError ? (
        <p className="text-sm text-negative py-4">Couldn't load photos. Try refreshing.</p>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-border">
          <LottieEmpty title="No progress photos yet" subtitle="Tap + Add photo to start a visual record" />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo) => {
            const selected = compareIds.includes(photo.id)
            return (
              <button
                key={photo.id}
                onClick={() => (compareMode ? toggleCompare(photo.id) : setLightbox(photo))}
                className="shrink-0 flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className={`w-[100px] h-[140px] rounded-xl overflow-hidden bg-surface-elevated border-2 ${selected ? 'border-accent' : 'border-border'}`}
                >
                  {photo.url ? (
                    <img src={photo.url} alt={fmtDate(photo.photo_date)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-subtle text-[10px]">?</div>
                  )}
                </div>
                <p className="text-[10px] text-text-subtle">{fmtDate(photo.photo_date)}</p>
              </button>
            )
          })}
        </div>
      )}

      {compareMode && comparePhotos.length === 2 && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface border border-border p-3">
          {comparePhotos.map((photo) => (
            <div key={photo.id} className="flex flex-col gap-1.5">
              <p className="text-xs text-text-muted text-center">{fmtDate(photo.photo_date)}</p>
              {photo.url && (
                <img src={photo.url} alt={fmtDate(photo.photo_date)} className="w-full rounded-xl object-cover aspect-[3/4]" />
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
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
                  <button onClick={() => deleteMutation.mutate(lightbox.id)} disabled={deleteMutation.isPending} className="text-xs text-negative border border-negative/40 px-3 py-1.5 rounded-lg">
                    {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                  </button>
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
        </div>
      )}
    </div>
  )
}
