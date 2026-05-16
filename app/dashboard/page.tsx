import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { getUserPlan } from '@/lib/plan'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [
    { data: folders },
    { data: recentOpens },
    { data: profile },
    { data: broadcasts },
    { count: charCount },
  ] = await Promise.all([
    supabase.from('folders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('document_opens')
      .select('document_id, opened_at, documents(id, title, folder_id, folders(name))')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('onboarded, plan').eq('user_id', user.id).single(),
    supabase.from('broadcasts')
      .select('*')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('worldbuilding_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('section', 'characters'),
  ])

  const plan = await getUserPlan(user.id)

  // Deduplicate recent docs
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

  // Count total docs across all folders for checklist
  const folderList = folders || []
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <DashboardClient
      initialFolders={folderList}
      userId={user.id}
      recentDocs={recentDocs}
      plan={plan}
      onboarded={profile?.onboarded ?? true}
      broadcasts={(broadcasts || []) as Array<{ id: string; message: string; created_at: string; expires_at: string | null }>}
      checklistProps={{
        folderCount: folderList.length,
        docCount: totalDocs || 0,
        characterCount: charCount ?? 0,
        hasProfile: false,
      }}
    />
  )
}
