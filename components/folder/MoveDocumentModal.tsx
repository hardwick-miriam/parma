'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import type { Document, Folder } from '@/types'
import { FOLDER_ICONS } from '@/lib/constants'

type Props = {
  document: Document
  currentFolderId: string
  userId: string
  onClose: () => void
  onMove: (docId: string, folderId: string) => void
}

export default function MoveDocumentModal({ document, currentFolderId, userId, onClose, onMove }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .neq('id', currentFolderId)
      .order('name')
      .then(({ data }) => setFolders(data || []))
  }, [userId, currentFolderId]) // eslint-disable-line

  return (
    <Modal title={`Move "${document.title}"`} onClose={onClose}>
      {folders.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No other folders available.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {folders.map((folder) => {
            const IconComponent = FOLDER_ICONS[folder.icon] || FOLDER_ICONS['folder']
            return (
              <button
                key={folder.id}
                onClick={() => onMove(document.id, folder.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded border text-left"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <IconComponent size={14} style={{ color: folder.color }} />
                <span className="text-sm">{folder.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
