'use client'

import { useState, useRef, useEffect } from 'react'
import type { WorldbuildingEntry } from '@/types'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'

type Props = {
  entry: WorldbuildingEntry
  onUpdate: (id: string, changes: Partial<WorldbuildingEntry>) => void
  onDelete: (id: string) => void
}

export default function EntryItem({ entry, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(entry.name)
  const [content, setContent] = useState(entry.content)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameRef.current?.select()
  }, [editingName])

  const commitName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== entry.name) onUpdate(entry.id, { name: trimmed })
    else setName(entry.name)
    setEditingName(false)
  }

  const commitContent = () => {
    if (content !== entry.content) onUpdate(entry.id, { content })
  }

  return (
    <div
      className="rounded border"
      style={{ borderColor: expanded ? '#252535' : 'transparent', background: expanded ? '#0e0e18' : 'transparent' }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ color: '#44445a', flexShrink: 0 }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {editingName ? (
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setName(entry.name); setEditingName(false) }
            }}
            className="flex-1 text-xs bg-transparent outline-none border-b min-w-0"
            style={{ color: '#c8c8e0', borderColor: '#4a4a7a' }}
          />
        ) : (
          <button
            className="flex-1 text-left text-xs truncate min-w-0"
            style={{ color: '#a0a0c0' }}
            onDoubleClick={() => setEditingName(true)}
          >
            {entry.name}
          </button>
        )}

        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0"
          style={{ color: '#8a3a3a' }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={commitContent}
            rows={3}
            className="w-full text-xs resize-none outline-none rounded px-2 py-1.5 border"
            style={{
              background: '#07070d',
              borderColor: '#1a1a28',
              color: '#8888a8',
              lineHeight: '1.6',
            }}
            placeholder="Notes…"
          />
        </div>
      )}
    </div>
  )
}
