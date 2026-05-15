'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Folder } from '@/types'
import FolderCard from './FolderCard'
import NewFolderModal from './NewFolderModal'
import EditFolderModal from './EditFolderModal'
import SearchBar from '@/components/search/SearchBar'
import { Plus, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

type Props = {
  initialFolders: Folder[]
  userId: string
}

export default function DashboardClient({ initialFolders, userId }: Props) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [showNew, setShowNew] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const createFolder = async (name: string, color: string, icon: string) => {
    const { data } = await supabase
      .from('folders')
      .insert({ name, color, icon, user_id: userId })
      .select()
      .single()
    if (data) setFolders((prev) => [data, ...prev])
    setShowNew(false)
  }

  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    const { data } = await supabase
      .from('folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setFolders((prev) => prev.map((f) => (f.id === id ? data : f)))
    setEditingFolder(null)
  }

  const deleteFolder = async (id: string) => {
    await supabase.from('folders').delete().eq('id', id)
    setFolders((prev) => prev.filter((f) => f.id !== id))
    setEditingFolder(null)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#1a1a1f' }}>
      {/* SVG filigree pattern — rendered directly in DOM, no CSS data-uri */}
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <defs>
          <pattern id="filigree" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
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
        <rect width="100%" height="100%" fill="url(#filigree)" />
      </svg>

      {/* Header */}
      <header
        className="border-b sticky top-0 z-20"
        style={{
          background: 'rgba(22,16,12,0.96)',
          borderColor: '#3a3228',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crest.png"
            alt="Parma"
            style={{ height: 48, width: 'auto', objectFit: 'contain', filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.78, flexShrink: 0 }}
          />

          <div className="flex-1 max-w-xl mx-auto">
            <SearchBar userId={userId} />
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border flex-shrink-0"
            style={{ color: '#5a5048', borderColor: '#3a3228', background: 'transparent', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6b2737'; (e.currentTarget as HTMLElement).style.color = '#9a9088' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#3a3228'; (e.currentTarget as HTMLElement).style.color = '#5a5048' }}
            title="Settings"
          >
            <Settings size={12} />
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border flex-shrink-0"
            style={{ color: '#5a5048', borderColor: '#3a3228', background: 'transparent', letterSpacing: '0.04em' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6b2737'; e.currentTarget.style.color = '#9a9088' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3a3228'; e.currentTarget.style.color = '#5a5048' }}
            title="Sign out"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content — sits above filigree */}
      <main className="max-w-6xl mx-auto px-6 py-8" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <h2
            className="text-xs uppercase"
            style={{ color: '#5a5048', letterSpacing: '0.18em', fontWeight: 300 }}
          >
            Folios
          </h2>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded border"
            style={{ background: '#2d1520', borderColor: '#6b2737', color: '#a8a8b0', letterSpacing: '0.05em' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}
          >
            <Plus size={13} />
            New Folder
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm" style={{ color: '#5a5048', letterSpacing: '0.05em', fontWeight: 300 }}>
              No folios yet. Create one to begin writing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onEdit={() => setEditingFolder(folder)}
              />
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewFolderModal onClose={() => setShowNew(false)} onCreate={createFolder} />
      )}
      {editingFolder && (
        <EditFolderModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onUpdate={updateFolder}
          onDelete={deleteFolder}
        />
      )}
    </div>
  )
}
