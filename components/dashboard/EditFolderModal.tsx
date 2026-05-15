'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { Folder } from '@/types'
import { FOLDER_COLORS, FOLDER_ICONS } from '@/lib/constants'

type Props = {
  folder: Folder
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Folder>) => void
  onDelete: (id: string) => void
}

export default function EditFolderModal({ folder, onClose, onUpdate, onDelete }: Props) {
  const [name, setName] = useState(folder.name)
  const [color, setColor] = useState(folder.color)
  const [icon, setIcon] = useState(folder.icon)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = () => {
    if (!name.trim()) return
    onUpdate(folder.id, { name: name.trim(), color, icon })
  }

  if (confirmDelete) {
    return (
      <Modal title="Delete Folder" onClose={() => setConfirmDelete(false)}>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Delete &ldquo;{folder.name}&rdquo; and all its documents? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-4 py-2 text-sm rounded border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(folder.id)}
            className="px-4 py-2 text-sm rounded"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            Delete
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Edit Folder" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2 rounded border text-sm outline-none"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className="w-6 h-6 rounded-full border-2"
                style={{ background: c.value, borderColor: color === c.value ? '#fff' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Icon</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(FOLDER_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setIcon(key)}
                className="p-2 rounded border"
                style={{
                  background: icon === key ? 'var(--accent-subtle)' : 'transparent',
                  borderColor: icon === key ? 'var(--border-focus)' : 'var(--border)',
                  color: icon === key ? 'var(--accent-hover)' : 'var(--text-muted)',
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-between pt-1">
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 text-sm rounded border"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-4 py-2 text-sm rounded"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
