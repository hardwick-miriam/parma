import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/admin/AdminClient'

const ADMIN_EMAIL = 'hardwickars@gmail.com'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const admin = createAdminClient()

  // Fetch all profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, plan, plan_type, plan_expires_at, last_active_at, total_words_written, banned, stripe_customer_id')

  // Fetch auth users for emails + created_at
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  // Fetch document counts per user
  const { data: docCounts } = await admin
    .from('documents')
    .select('user_id')

  const docCountMap = new Map<string, number>()
  for (const d of docCounts || []) {
    docCountMap.set(d.user_id, (docCountMap.get(d.user_id) || 0) + 1)
  }

  // Merge
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))
  const users = (authUsers || []).map(u => {
    const p = profileMap.get(u.id)
    return {
      user_id: u.id,
      email: u.email || '',
      created_at: u.created_at,
      plan: p?.plan || 'free',
      plan_type: p?.plan_type || null,
      last_active_at: p?.last_active_at || null,
      total_words_written: p?.total_words_written || 0,
      banned: p?.banned || false,
      doc_count: docCountMap.get(u.id) || 0,
    }
  })

  // Stats
  const premium = users.filter(u => u.plan === 'premium' && !u.banned)
  const monthlyCount = premium.filter(u => u.plan_type === 'monthly').length
  const annualCount = premium.filter(u => u.plan_type === 'annual').length
  const mrr = monthlyCount * 4.99 + annualCount * (47.99 / 12)
  const arr = mrr * 12

  const stats = {
    total: users.length,
    free: users.filter(u => u.plan !== 'premium').length,
    premium: premium.length,
    monthlyCount,
    annualCount,
    mrr,
    arr,
  }

  // Broadcasts
  const { data: broadcasts } = await admin
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <AdminClient
      stats={stats}
      users={users}
      broadcasts={broadcasts || []}
    />
  )
}
