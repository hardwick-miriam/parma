import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [{ data: folders }, { data: recentOpens }] = await Promise.all([
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('document_opens')
      .select('document_id, opened_at, documents(id, title, folder_id, folders(name))')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(20),
  ])

  // Deduplicate by document_id, keep most recent
  type RawDoc = { id: string; title: string; folder_id: string; folders: { name: string } | null }
  const seen = new Set<string>()
  const recentDocs: Array<{ id: string; title: string; folder_id: string; folder_name: string; opened_at: string }> = []
  for (const row of recentOpens || []) {
    const doc = (row.documents as unknown) as RawDoc | null
    if (!doc || seen.has(doc.id)) continue
    seen.add(doc.id)
    recentDocs.push({
      id: doc.id,
      title: doc.title,
      folder_id: doc.folder_id,
      folder_name: doc.folders?.name || '',
      opened_at: row.opened_at,
    })
    if (recentDocs.length >= 4) break
  }

  return (
    <DashboardClient
      initialFolders={folders || []}
      userId={user.id}
      recentDocs={recentDocs}
    />
  )
}
