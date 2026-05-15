'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { Folder } from '@/types'
import { FOLDER_COLORS, FOLDER_ICONS } from '@/lib/constants'
import { Globe } from 'lucide-react'

type Props = {
  folder: Folder
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Folder>) => void
  onDelete: (id: string) => void
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'No status' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
]

export default function EditFolderModal({ folder, onClose, onUpdate, onDelete }: Props) {
  const [name, setName] = useState(folder.name)
  const [color, setColor] = useState(folder.color)
  const [icon, setIcon] = useState(folder.icon)
  const [status, setStatus] = useState(folder.status || '')
  const [isPublic, setIsPublic] = useState(folder.is_public || false)
  const [isFeatured, setIsFeatured] = useState(folder.is_featured || false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = () => {
    if (!name.trim()) return
    onUpdate(folder.id, {
      name: name.trim(), color, icon,
      status: (status || null) as Folder['status'],
      is_public: isPublic,
      is_featured: isFeatured,
    })
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

        {/* Status */}
        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded border text-sm outline-none"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Public / Featured */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={isPublic} onChange={e => { setIsPublic(e.target.checked); if (!e.target.checked) setIsFeatured(false) }}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>Make public</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Visible on your profile page</p>
            </div>
          </label>
          {isPublic && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingLeft: 22 }}>
              <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={11} /> Feature on profile
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Shown prominently on your public profile</p>
              </div>
            </label>
          )}
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
