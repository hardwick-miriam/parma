import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditorClient from '@/components/editor/EditorClient'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!document) notFound()

  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', document.folder_id)
    .single()

  const { data: worldbuilding } = await supabase
    .from('worldbuilding_entries')
    .select('*')
    .eq('folder_id', document.folder_id)
    .order('created_at')

  return (
    <EditorClient
      document={document}
      folder={folder!}
      initialWorldbuilding={worldbuilding || []}
      userId={user.id}
    />
  )
}
