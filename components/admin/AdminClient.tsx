'use client'

import { useState } from 'react'
import { Shield, Users, Radio, TrendingUp, ChevronUp, ChevronDown, RefreshCw, Ban, Crown } from 'lucide-react'

type UserRow = {
  user_id: string
  email: string
  created_at: string
  plan: string
  plan_type: string | null
  last_active_at: string | null
  total_words_written: number
  banned: boolean
  doc_count: number
}

type BroadcastRow = {
  id: string
  message: string
  created_at: string
  expires_at: string | null
}

type Props = {
  stats: { total: number; free: number; premium: number; monthlyCount: number; annualCount: number; mrr: number; arr: number }
  users: UserRow[]
  broadcasts: BroadcastRow[]
}

const TABS = ['Overview', 'Users', 'Broadcasts'] as const
type Tab = typeof TABS[number]

export default function AdminClient({ stats, users: initialUsers, broadcasts: initialBroadcasts }: Props) {
  const [tab, setTab] = useState<Tab>('Overview')
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>(initialBroadcasts)
  const [sortKey, setSortKey] = useState<keyof UserRow>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastDays, setBroadcastDays] = useState('7')
  const [working, setWorking] = useState<string | null>(null)

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const bdr = '#2a2218'

  const sorted = [...users].sort((a, b) => {
    const av = String(a[sortKey] ?? '')
    const bv = String(b[sortKey] ?? '')
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const toggleSort = (k: keyof UserRow) => {
    if (sortKey === k) setSortAsc(v => !v)
    else { setSortKey(k); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: keyof UserRow }) => {
    if (sortKey !== k) return null
    return sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
  }

  const api = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json()
  }

  const setPlan = async (userId: string, plan: 'free' | 'premium') => {
    setWorking(userId + plan)
    await api('/api/admin/set-plan', { userId, plan })
    setUsers(u => u.map(r => r.user_id === userId ? { ...r, plan } : r))
    setWorking(null)
  }

  const toggleBan = async (userId: string, banned: boolean) => {
    setWorking(userId + 'ban')
    await api('/api/admin/ban-user', { userId, banned })
    setUsers(u => u.map(r => r.user_id === userId ? { ...r, banned } : r))
    setWorking(null)
  }

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return
    setWorking('broadcast')
    const res = await api('/api/admin/broadcast', { message: broadcastMsg, expiresInDays: Number(broadcastDays) || undefined })
    if (res.ok) {
      setBroadcasts(b => [{ id: res.id, message: broadcastMsg, created_at: new Date().toISOString(), expires_at: null }, ...b])
      setBroadcastMsg('')
    }
    setWorking(null)
  }

  const statCard = (label: string, value: string | number, sub?: string) => (
    <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '1.25rem 1.5rem' }}>
      <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      <p style={{ color: ink, fontSize: '1.5rem', fontFamily: 'var(--font-garamond)', fontWeight: 400 }}>{value}</p>
      {sub && <p style={{ color: '#3a3228', fontSize: '0.62rem', marginTop: 4 }}>{sub}</p>}
    </div>
  )

  const thBtn: React.CSSProperties = { background: 'none', border: 'none', color: dim, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 0', whiteSpace: 'nowrap' }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b08', color: ink }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${bdr}`, background: '#100d0a', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={16} color="#6b2737" />
          <span style={{ color: dim, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parma Admin</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '6px 14px', background: tab === t ? '#2d1520' : 'none', border: `1px solid ${tab === t ? '#6b2737' : 'transparent'}`, borderRadius: 3, color: tab === t ? ink : dim, fontSize: '0.68rem', letterSpacing: '0.06em', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {tab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {statCard('Total Users', stats.total)}
              {statCard('Free', stats.free)}
              {statCard('Premium', stats.premium, `${stats.monthlyCount} monthly · ${stats.annualCount} annual`)}
              {statCard('MRR', `£${stats.mrr.toFixed(2)}`, 'Monthly recurring')}
              {statCard('ARR', `£${stats.arr.toFixed(2)}`, 'Annual recurring')}
            </div>
            <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '1.5rem' }}>
              <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Revenue breakdown</p>
              <div style={{ display: 'flex', gap: 32 }}>
                <div>
                  <p style={{ color: dim, fontSize: '0.65rem' }}>Monthly subscribers</p>
                  <p style={{ color: ink, fontSize: '1.1rem', fontFamily: 'var(--font-garamond)' }}>{stats.monthlyCount} × £4.99 = £{(stats.monthlyCount * 4.99).toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ color: dim, fontSize: '0.65rem' }}>Annual subscribers (monthly equiv.)</p>
                  <p style={{ color: ink, fontSize: '1.1rem', fontFamily: 'var(--font-garamond)' }}>{stats.annualCount} × £{(47.99 / 12).toFixed(2)} = £{(stats.annualCount * 47.99 / 12).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Users' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                  {([
                    ['email', 'Email'],
                    ['created_at', 'Signed up'],
                    ['plan', 'Plan'],
                    ['last_active_at', 'Last active'],
                    ['doc_count', 'Docs'],
                    ['total_words_written', 'Words'],
                  ] as [keyof UserRow, string][]).map(([k, label]) => (
                    <th key={k} style={{ padding: '8px 12px', textAlign: 'left' }}>
                      <button style={thBtn} onClick={() => toggleSort(k)}>
                        {label} <SortIcon k={k} />
                      </button>
                    </th>
                  ))}
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>
                    <span style={{ ...thBtn, cursor: 'default' }}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: `1px solid ${bdr}`, opacity: u.banned ? 0.5 : 1 }}>
                    <td style={{ padding: '8px 12px', color: ink }}>
                      <span>{u.email}</span>
                      {u.banned && <span style={{ marginLeft: 6, color: '#c0504a', fontSize: '0.58rem' }}>BANNED</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: dim }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: u.plan === 'premium' ? '#9a6070' : dim, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {u.plan === 'premium' && <Crown size={10} />}
                        {u.plan}{u.plan_type ? ` (${u.plan_type})` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: dim }}>{u.last_active_at ? new Date(u.last_active_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '8px 12px', color: dim }}>{u.doc_count}</td>
                    <td style={{ padding: '8px 12px', color: dim }}>{u.total_words_written?.toLocaleString() || 0}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setPlan(u.user_id, u.plan === 'premium' ? 'free' : 'premium')}
                          disabled={working !== null}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'none', border: `1px solid ${bdr}`, borderRadius: 3, color: dim, fontSize: '0.62rem', cursor: 'pointer' }}
                          title={u.plan === 'premium' ? 'Downgrade to free' : 'Upgrade to premium'}>
                          {working === u.user_id + u.plan ? <RefreshCw size={9} /> : <Crown size={9} />}
                          {u.plan === 'premium' ? 'Free' : 'Premium'}
                        </button>
                        <button
                          onClick={() => toggleBan(u.user_id, !u.banned)}
                          disabled={working !== null}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'none', border: `1px solid ${bdr}`, borderRadius: 3, color: u.banned ? '#4a8a4a' : '#8a3a3a', fontSize: '0.62rem', cursor: 'pointer' }}>
                          {working === u.user_id + 'ban' ? <RefreshCw size={9} /> : <Ban size={9} />}
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Broadcasts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
            <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '1.5rem' }}>
              <p style={{ color: dim, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                <Radio size={10} style={{ display: 'inline', marginRight: 5 }} />Send broadcast
              </p>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Message shown to all users on next login…"
                rows={4}
                style={{ width: '100%', background: '#111', border: `1px solid ${bdr}`, color: ink, fontSize: '0.72rem', padding: '8px 10px', borderRadius: 3, outline: 'none', resize: 'vertical', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: dim, fontSize: '0.65rem' }}>Expires after</span>
                <input type="number" value={broadcastDays} onChange={e => setBroadcastDays(e.target.value)} min={1} max={90}
                  style={{ width: 60, background: '#111', border: `1px solid ${bdr}`, color: ink, fontSize: '0.7rem', padding: '4px 8px', borderRadius: 3, outline: 'none' }} />
                <span style={{ color: dim, fontSize: '0.65rem' }}>days</span>
              </div>
              <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || working === 'broadcast'}
                style={{ padding: '8px 20px', background: '#2d1520', border: '1px solid #6b2737', borderRadius: 3, color: '#a8a8b0', fontSize: '0.72rem', cursor: 'pointer' }}>
                {working === 'broadcast' ? 'Sending…' : 'Send to all users'}
              </button>
            </div>

            <div>
              <p style={{ color: dim, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>History</p>
              {broadcasts.length === 0 && <p style={{ color: '#2a2218', fontSize: '0.72rem' }}>No broadcasts yet.</p>}
              {broadcasts.map(b => (
                <div key={b.id} style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 3, padding: '1rem', marginBottom: 8 }}>
                  <p style={{ color: ink, fontSize: '0.75rem', marginBottom: 6 }}>{b.message}</p>
                  <p style={{ color: dim, fontSize: '0.6rem' }}>
                    {new Date(b.created_at).toLocaleDateString('en-GB')}
                    {b.expires_at && ` · expires ${new Date(b.expires_at).toLocaleDateString('en-GB')}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
