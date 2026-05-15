'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Document, Folder } from '@/types'
import DocumentItem from './DocumentItem'
import MoveDocumentModal from './MoveDocumentModal'
import { ArrowLeft, Plus } from 'lucide-react'
import { FOLDER_ICONS } from '@/lib/constants'
import Link from 'next/link'

type Props = {
  folder: Folder
  initialDocuments: Document[]
  userId: string
}

export default function FolderClient({ folder, initialDocuments, userId }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [movingDoc, setMovingDoc] = useState<Document | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const IconComponent = FOLDER_ICONS[folder.icon] || FOLDER_ICONS['folder']

  const createDocument = async () => {
    const { data } = await supabase
      .from('documents')
      .insert({ folder_id: folder.id, user_id: userId, title: 'Untitled', content: {} })
      .select()
      .single()
    if (data) router.push(`/document/${data.id}`)
  }

  const renameDocument = async (id: string, title: string) => {
    await supabase.from('documents').update({ title, updated_at: new Date().toISOString() }).eq('id', id)
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)))
  }

  const deleteDocument = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const moveDocument = async (docId: string, targetFolderId: string) => {
    await supabase
      .from('documents')
      .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
      .eq('id', docId)
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    setMovingDoc(null)
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#1a1a1f' }}>
      {/* Filigree */}
      <svg aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="filigree-folder" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="rgba(192,192,192,0.07)" strokeWidth="0.5">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" />
              <path d="M30 14 L46 30 L30 46 L14 30 Z" />
              <circle cx="30" cy="30" r="5" />
              <circle cx="0" cy="0" r="3.5" />
              <circle cx="60" cy="0" r="3.5" />
              <circle cx="0" cy="60" r="3.5" />
              <circle cx="60" cy="60" r="3.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#filigree-folder)" />
      </svg>
      <header
        className="border-b sticky top-0 z-20"
        style={{ background: 'rgba(18,12,8,0.96)', borderColor: '#3a3228', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="p-1 rounded flex items-center gap-3" style={{ color: '#5a5048' }}>
            <ArrowLeft size={15} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/crest.png"
              alt="Parma"
              style={{ height: 48, width: 'auto', objectFit: 'contain', filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.65, flexShrink: 0 }}
            />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <IconComponent size={15} style={{ color: folder.color, flexShrink: 0 }} />
            <span className="text-sm truncate" style={{ color: '#d4cfc8', letterSpacing: '0.04em', fontWeight: 300 }}>
              {folder.name}
            </span>
          </div>
          <button
            onClick={createDocument}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border"
            style={{ background: '#2d1520', borderColor: '#6b2737', color: '#a8a8b0', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}
          >
            <Plus size={12} />
            <span className="hidden sm:inline">New document</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6" style={{ position: 'relative', zIndex: 1 }}>
        {documents.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm" style={{ color: '#5a5048', letterSpacing: '0.05em', fontWeight: 300 }}>
              No documents yet. Create one to start writing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: '#3a3228' }}>
            {documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                onRename={renameDocument}
                onDelete={deleteDocument}
                onMove={() => setMovingDoc(doc)}
              />
            ))}
          </div>
        )}
      </main>

      {movingDoc && (
        <MoveDocumentModal
          document={movingDoc}
          currentFolderId={folder.id}
          userId={userId}
          onClose={() => setMovingDoc(null)}
          onMove={moveDocument}
        />
      )}
    </div>
  )
}
