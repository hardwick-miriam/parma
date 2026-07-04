'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface ShareButtonProps {
  type: 'daily' | 'weekly' | 'pr'
  exercise?: string
  className?: string
  label?: string
}

export function ShareButton({ type, exercise, className, label }: ShareButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      if (exercise) params.set('exercise', exercise)

      const res = await fetch(`/api/share?${params}`)
      if (!res.ok) throw new Error('Failed to generate card')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Use native share sheet if available (mobile)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'parma.png', { type: blob.type })] })) {
        await navigator.share({
          files: [new File([blob], 'parma.png', { type: blob.type })],
          title: 'Parma health card',
        })
      } else {
        // Desktop: download the image
        const a = document.createElement('a')
        a.href = url
        a.download = `parma-${type}-${new Date().toISOString().split('T')[0]}.png`
        a.click()
        toast.success('Card downloaded')
      }

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[share]', err)
      toast.error('Could not generate share card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title={`Share ${type} card`}
      className={className}
      style={{ opacity: loading ? 0.5 : 1 }}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )}
      {label && <span className="ml-1.5 text-xs">{label}</span>}
    </button>
  )
}
