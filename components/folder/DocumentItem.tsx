'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { Document } from '@/types'
import ContextMenu from '@/components/ui/ContextMenu'
import { FileText } from 'lucide-react'

type Props = {
  document: Document
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMove: () => void
}

export default function DocumentItem({ document, onRename, onDelete, onMove }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(document.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== document.title) onRename(document.id, trimmed)
    else setRenameValue(document.title)
    setRenaming(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const updated = new Date(document.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const menuItems = [
    { label: 'Open', action: () => { window.location.href = `/document/${document.id}` } },
    { label: 'Rename', action: () => { setRenaming(true); setContextMenu(null) } },
    { label: 'Move to…', action: () => { onMove(); setContextMenu(null) } },
    { label: 'Delete', action: () => { onDelete(document.id) }, danger: true },
  ]

  return (
    <>
      <div
        className="group flex items-center gap-3 py-3 cursor-default"
        onContextMenu={handleContextMenu}
      >
        <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setRenameValue(document.title); setRenaming(false) }
              }}
              className="w-full text-sm bg-transparent outline-none border-b"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-focus)' }}
            />
          ) : (
            <Link
              href={`/document/${document.id}`}
              className="text-sm truncate block"
              style={{ color: 'var(--text-primary)' }}
            >
              {document.title}
            </Link>
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {updated}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
