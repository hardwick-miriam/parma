'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Document, Folder } from '@/types'
import DocumentItem from './DocumentItem'
import MoveDocumentModal from './MoveDocumentModal'
import { ArrowLeft, Plus, GitBranch, Users, ArrowUpDown, Download } from 'lucide-react'
import { FOLDER_ICONS } from '@/lib/constants'
import Link from 'next/link'
import { exportEpub } from '@/lib/utils/epub'

type Props = {
  folder: Folder
  initialDocuments: Document[]
  userId: string
}

type SortKey = 'updated' | 'created' | 'title'

export default function FolderClient({ folder, initialDocuments, userId }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [movingDoc, setMovingDoc] = useState<Document | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortAsc, setSortAsc] = useState(false)
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const IconComponent = FOLDER_ICONS[folder.icon] || FOLDER_ICONS['folder']

  const sorted = useMemo(() => {
    return [...documents].sort((a, b) => {
      let av: string, bv: string
      if (sortKey === 'title') { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
      else if (sortKey === 'created') { av = a.created_at; bv = b.created_at }
      else { av = a.updated_at; bv = b.updated_at }
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [documents, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

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
    await supabase.from('documents').update({ folder_id: targetFolderId, updated_at: new Date().toISOString() }).eq('id', docId)
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    setMovingDoc(null)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportEpub(folder.name, documents)
    } finally {
      setExporting(false)
    }
  }

  const sortBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#5a5048', fontSize: '0.65rem', letterSpacing: '0.06em', padding: '2px 6px' }
  const sortBtnActive: React.CSSProperties = { ...sortBtn, color: '#9a9088' }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#1a1a1f' }}>
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

      <header className="border-b sticky top-0 z-20"
        style={{ background: 'rgba(18,12,8,0.96)', borderColor: '#3a3228', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="p-1 rounded flex items-center gap-3" style={{ color: '#5a5048' }}>
            <ArrowLeft size={15} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.png" alt="Parma"
              style={{ height: 48, width: 'auto', objectFit: 'contain', filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.65, flexShrink: 0 }} />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <IconComponent size={15} style={{ color: folder.color, flexShrink: 0 }} />
            <span className="text-sm truncate" style={{ color: '#d4cfc8', letterSpacing: '0.04em', fontWeight: 300 }}>
              {folder.name}
            </span>
          </div>
          <Link href={`/folder/${folder.id}/timeline`}
            className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border"
            style={{ borderColor: '#2a2218', color: '#5a5048', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#9a8a78' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5a5048' }}>
            <GitBranch size={12} />
            <span className="hidden sm:inline">Timeline</span>
          </Link>
          <Link href={`/folder/${folder.id}/characters`}
            className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border"
            style={{ borderColor: '#2a2218', color: '#5a5048', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#9a8a78' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5a5048' }}>
            <Users size={12} />
            <span className="hidden sm:inline">Characters</span>
          </Link>
          {documents.length > 0 && (
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border"
              style={{ borderColor: '#2a2218', color: '#5a5048', letterSpacing: '0.04em', background: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#9a8a78' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5a5048' }}
              title="Export as epub">
              <Download size={12} />
              <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Epub'}</span>
            </button>
          )}
          <button onClick={createDocument}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border"
            style={{ background: '#2d1520', borderColor: '#6b2737', color: '#a8a8b0', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}>
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
          <>
            {/* Sort controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, justifyContent: 'flex-end' }}>
              <ArrowUpDown size={10} color="#3a3228" />
              {(['updated', 'created', 'title'] as const).map(k => (
                <button key={k} onClick={() => toggleSort(k)} style={sortKey === k ? sortBtnActive : sortBtn}>
                  {k === 'updated' ? 'Modified' : k === 'created' ? 'Created' : 'Title'}
                  {sortKey === k && <span style={{ marginLeft: 3 }}>{sortAsc ? '↑' : '↓'}</span>}
                </button>
              ))}
            </div>

            <div className="flex flex-col divide-y" style={{ borderColor: '#3a3228' }}>
              {sorted.map((doc) => (
                <DocumentItem key={doc.id} document={doc}
                  onRename={renameDocument} onDelete={deleteDocument} onMove={() => setMovingDoc(doc)} />
              ))}
            </div>
          </>
        )}
      </main>

      {movingDoc && (
        <MoveDocumentModal document={movingDoc} currentFolderId={folder.id} userId={userId}
          onClose={() => setMovingDoc(null)} onMove={moveDocument} />
      )}
    </div>
  )
}
