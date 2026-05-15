'use client'

import { useState } from 'react'
import type { WorldbuildingEntry, WorldbuildingSection } from '@/types'
import EntryItem from './EntryItem'
import { Plus } from 'lucide-react'

type Props = {
  section: WorldbuildingSection
  label: string
  entries: WorldbuildingEntry[]
  onAdd: (name: string) => void
  onUpdate: (id: string, changes: Partial<WorldbuildingEntry>) => void
  onDelete: (id: string) => void
}

export default function SidebarSection({ label, entries, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const commit = () => {
    const trimmed = newName.trim()
    if (trimmed) onAdd(trimmed)
    setNewName('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: '#8888a8' }}>
          {label}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="p-0.5 rounded"
          style={{ color: '#44445a' }}
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <EntryItem
            key={entry.id}
            entry={entry}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        {adding && (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setNewName(''); setAdding(false) }
            }}
            className="w-full text-xs px-2 py-1.5 rounded border outline-none"
            style={{
              background: '#0e0e18',
              borderColor: '#4a4a7a',
              color: '#c8c8e0',
            }}
            placeholder="Name…"
          />
        )}
      </div>
    </div>
  )
}
