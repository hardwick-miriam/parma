'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Folder } from '@/types'
import { Settings } from 'lucide-react'
import { FOLDER_ICONS } from '@/lib/constants'

type Props = {
  folder: Folder
  onEdit: () => void
}

export default function FolderCard({ folder, onEdit }: Props) {
  const [hovered, setHovered] = useState(false)
  const IconComponent = FOLDER_ICONS[folder.icon] || FOLDER_ICONS['folder']

  return (
    <div
      className="relative group rounded-lg border overflow-hidden"
      style={{
        background: hovered ? '#342820' : '#2a2420',
        borderColor: hovered ? '#6b2737' : '#3a3228',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/folder/${folder.id}`} className="block p-5 pb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style={{
            background: `${folder.color}18`,
            border: `1px solid ${folder.color}38`,
          }}
        >
          <IconComponent size={18} style={{ color: folder.color }} />
        </div>
        <p
          className="text-sm truncate pr-6"
          style={{ color: '#d4cfc8', letterSpacing: '0.03em', fontWeight: 300 }}
        >
          {folder.name}
        </p>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onEdit() }}
        className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100"
        style={{ color: '#5a5048' }}
        title="Edit folder"
      >
        <Settings size={12} />
      </button>
    </div>
  )
}
