import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditorClient from '@/components/editor/EditorClient'
import type { UserSettings } from '@/types'
import { getUserPlan } from '@/lib/plan'

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  stack_style: 'Shuffled',
  pages_visible: 3,
  gap: 8,
  shadow_depth: 12,
  theme: 'default',
  accent_color: '#6b2737',
  editor_font: 'EB Garamond',
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!document) notFound()

  if (document.user_id !== user.id) {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('document_id', id)
      .eq('invitee_email', user.email!)
      .single()
    if (!collab) notFound()
  }

  const [{ data: folder }, { data: worldbuilding }, { data: settings }, plan] = await Promise.all([
    supabase.from('folders').select('*').eq('id', document.folder_id).single(),
    supabase.from('worldbuilding_entries').select('*').eq('folder_id', document.folder_id).order('created_at'),
    supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    getUserPlan(user.id),
  ])

  // Track document open (fire and forget)
  supabase.from('document_opens').insert({ user_id: user.id, document_id: id }).then(() => {})

  const initialSettings: UserSettings = settings ?? { user_id: user.id, ...DEFAULT_SETTINGS }

  return (
    <EditorClient
      document={document}
      folder={folder!}
      initialWorldbuilding={worldbuilding || []}
      userId={user.id}
      initialSettings={initialSettings}
      isPremium={plan === 'premium'}
    />
  )
}
