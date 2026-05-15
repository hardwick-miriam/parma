import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FolderClient from '@/components/folder/FolderClient'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('folder_id', id)
    .order('updated_at', { ascending: false })

  return (
    <FolderClient
      folder={folder}
      initialDocuments={documents || []}
      userId={user.id}
    />
  )
}
