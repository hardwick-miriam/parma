'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { extractPlainText } from '@/lib/utils/wordCount'

type Result = {
  id: string
  title: string
  folder_id: string
  folder_name: string
  snippet: string
}

type Props = {
  userId: string
}

export default function SearchBar({ userId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) { setResults([]); setOpen(false); return }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, folder_id, content, folders(name)')
        .eq('user_id', userId)

      if (docs) {
        const lower = trimmed.toLowerCase()
        const matched: Result[] = []

        for (const doc of docs) {
          const text = extractPlainText(doc.content as object | null)
          const titleMatch = doc.title.toLowerCase().includes(lower)
          const bodyIdx = text.toLowerCase().indexOf(lower)

          if (titleMatch || bodyIdx !== -1) {
            let snippet = ''
            if (bodyIdx !== -1) {
              const start = Math.max(0, bodyIdx - 40)
              const end = Math.min(text.length, bodyIdx + 80)
              snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
            }
            const folder = doc.folders as unknown as { name: string } | null
            matched.push({
              id: doc.id,
              title: doc.title,
              folder_id: doc.folder_id,
              folder_name: folder?.name ?? '',
              snippet,
            })
          }
        }

        setResults(matched.slice(0, 8))
        setOpen(true)
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, userId]) // eslint-disable-line

  const navigate = (docId: string) => {
    setQuery('')
    setOpen(false)
    router.push(`/document/${docId}`)
  }

  const highlight = (text: string, q: string) => {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      text.slice(0, idx) +
      `<mark style="background:transparent;color:#9090d8;font-weight:500">${text.slice(idx, idx + q.length)}</mark>` +
      text.slice(idx + q.length)
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex items-center gap-2 px-3 h-8 rounded border"
        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search documents…"
          className="flex-1 bg-transparent text-xs outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} style={{ color: 'var(--text-muted)' }}>
            <X size={12} />
          </button>
        )}
        {loading && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded border z-50 overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(r.id)}
              className="w-full text-left px-4 py-3 border-b last:border-0"
              style={{ borderColor: 'var(--border)', background: 'transparent' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}
                  dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.folder_name}
                </span>
              </div>
              {r.snippet && (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: highlight(r.snippet, query) }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded border z-50 px-4 py-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No results found.</span>
        </div>
      )}
    </div>
  )
}
