import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Folder } from '@/types'
import { FOLDER_ICONS } from '@/lib/constants'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', profile.user_id)
    .eq('is_public', true)
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const border = '#3a3228'

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1f' }}>
      {/* Background filigree */}
      <svg aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="filigree" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="rgba(192,192,192,0.05)" strokeWidth="0.5">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" />
              <path d="M30 14 L46 30 L30 46 L14 30 Z" />
              <circle cx="30" cy="30" r="5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#filigree)" />
      </svg>

      <header className="border-b" style={{ background: 'rgba(18,12,8,0.96)', borderColor: border, backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2" style={{ color: dim }}>
            <ArrowLeft size={14} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>Parma</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 1 }}>
        {/* Profile header */}
        <div className="flex items-start gap-6 mb-12">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.username}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${border}`, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#2a2420', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: dim, fontSize: '1.5rem', fontWeight: 300 }}>{profile.username[0]?.toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 style={{ color: ink, fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.06em', marginBottom: 6 }}>
              {profile.username}
            </h1>
            {profile.bio && (
              <p style={{ color: dim, fontSize: '0.8rem', lineHeight: 1.7, maxWidth: 480 }}>{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Featured works */}
        {folders && folders.length > 0 ? (
          <div>
            <h2 style={{ color: dim, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1.5rem', fontWeight: 300 }}>
              Featured works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(folders as Folder[]).map(folder => {
                const Icon = FOLDER_ICONS[folder.icon] || FOLDER_ICONS['folder']
                return (
                  <div key={folder.id} className="rounded-lg border p-5"
                    style={{ background: '#2a2420', borderColor: border }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${folder.color}18`, border: `1px solid ${folder.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} style={{ color: folder.color }} />
                      </div>
                      <span style={{ color: ink, fontSize: '0.85rem', fontWeight: 300, letterSpacing: '0.04em' }}>{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: dim, fontSize: '0.65rem' }}>
                      <BookOpen size={10} />
                      <span>{folder.status ? folder.status.replace('_', ' ') : 'In progress'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p style={{ color: dim, fontSize: '0.75rem', letterSpacing: '0.08em' }}>No featured works yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center" style={{ borderColor: border }}>
          <p style={{ color: '#2a2218', fontSize: '0.62rem', letterSpacing: '0.1em' }}>
            Written with <Link href="/" style={{ color: '#3a3228' }}>Parma</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
