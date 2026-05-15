import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import CharactersClient from '@/components/characters/CharactersClient'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!folder) notFound()

  const [
    { data: relationships },
    { data: positions },
    { data: relTypes },
    { data: factions },
    { data: charMeta },
  ] = await Promise.all([
    supabase.from('character_relationships').select('*').eq('folder_id', id).eq('user_id', user.id).order('created_at'),
    supabase.from('character_positions').select('*').eq('folder_id', id).eq('user_id', user.id),
    supabase.from('relationship_types').select('*').eq('folder_id', id).eq('user_id', user.id),
    supabase.from('factions').select('*').eq('folder_id', id).eq('user_id', user.id),
    supabase.from('worldbuilding_entries').select('*').eq('folder_id', id).eq('user_id', user.id).eq('section', 'characters'),
  ])

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1f' }}>
      <header
        className="border-b sticky top-0 z-20"
        style={{ background: 'rgba(18,12,8,0.96)', borderColor: '#3a3228', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href={`/folder/${id}`} className="flex items-center gap-2 p-1" style={{ color: '#5a5048' }}>
            <ArrowLeft size={14} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>{folder.name}</span>
          </Link>
          <span style={{ color: '#3a3228', fontSize: '0.65rem', letterSpacing: '0.1em' }}>/</span>
          <span style={{ color: '#6a5a48', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Characters</span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto">
        <CharactersClient
          folderId={id}
          userId={user.id}
          initialRelationships={relationships || []}
          initialPositions={positions || []}
          initialRelTypes={relTypes || []}
          initialFactions={factions || []}
          initialCharMeta={charMeta || []}
        />
      </div>
    </div>
  )
}
