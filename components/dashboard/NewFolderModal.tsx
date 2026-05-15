'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FOLDER_COLORS, FOLDER_ICONS } from '@/lib/constants'

type Props = {
  onClose: () => void
  onCreate: (name: string, color: string, icon: string) => void
}

export default function NewFolderModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0].value)
  const [icon, setIcon] = useState('folder')

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), color, icon)
  }

  return (
    <Modal title="New Folder" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2 rounded border text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="Folder name"
          />
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className="w-6 h-6 rounded-full border-2"
                style={{
                  background: c.value,
                  borderColor: color === c.value ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Icon
          </label>
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

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded"
            style={{
              background: name.trim() ? 'var(--accent)' : 'var(--bg-card)',
              color: name.trim() ? '#fff' : 'var(--text-muted)',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
