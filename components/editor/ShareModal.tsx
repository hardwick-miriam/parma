'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Collaborator } from '@/types'
import { X, Copy, Check, UserPlus, Trash2 } from 'lucide-react'

type Props = {
  documentId: string
  userId: string
  onClose: () => void
}

export default function ShareModal({ documentId, userId, onClose }: Props) {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    const init = async () => {
      // Fetch or create share token
      const { data: existing } = await supabase
        .from('share_tokens')
        .select('token')
        .eq('document_id', documentId)
        .single()

      if (existing) {
        setToken(existing.token)
      } else {
        const { data: created } = await supabase
          .from('share_tokens')
          .insert({ document_id: documentId })
          .select('token')
          .single()
        if (created) setToken(created.token)
      }

      // Fetch collaborators
      const { data: collabs } = await supabase
        .from('collaborators')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at')
      setCollaborators(collabs || [])
    }
    init()
  }, [documentId, supabase])

  const shareUrl = token ? `${window.location.origin}/share/${token}` : ''

  const copyUrl = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setInviteError('Enter a valid email'); return }
    setInviting(true)
    setInviteError('')
    const { data, error } = await supabase
      .from('collaborators')
      .insert({ document_id: documentId, owner_id: userId, invitee_email: email })
      .select()
      .single()
    setInviting(false)
    if (error) { setInviteError(error.message.includes('unique') ? 'Already invited' : 'Failed to invite'); return }
    if (data) { setCollaborators(prev => [...prev, data]); setInviteEmail('') }
  }

  const removeCollaborator = async (id: string) => {
    await supabase.from('collaborators').delete().eq('id', id)
    setCollaborators(prev => prev.filter(c => c.id !== id))
  }

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
  const label: React.CSSProperties = { color: '#5a5048', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }
  const input: React.CSSProperties = {
    flex: 1, background: '#1a1510', border: '1px solid #3a3228',
    color: '#d4cfc8', fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#1e1a16', border: '1px solid #3a3228', borderRadius: 4,
          padding: '1.5rem', width: 420, maxWidth: '95vw',
          boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#d4cfc8', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 300 }}>
            Share document
          </h2>
          <button onClick={onClose} style={{ color: '#5a5048', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Read-only link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={label}>Public read-only link</p>
          <div style={row}>
            <input
              readOnly
              value={shareUrl || 'Generating…'}
              style={{ ...input, color: '#7a6a58', cursor: 'default' }}
            />
            <button
              onClick={copyUrl}
              disabled={!shareUrl}
              style={{
                background: copied ? '#2a4a2a' : '#2d1520', border: `1px solid ${copied ? '#4a8a4a' : '#6b2737'}`,
                color: copied ? '#8ad88a' : '#a8a8b0', borderRadius: 3, padding: '6px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', whiteSpace: 'nowrap',
              }}
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Co-editing invite */}
        <div>
          <p style={label}>Invite collaborator</p>
          <div style={row}>
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') invite() }}
              style={input}
            />
            <button
              onClick={invite}
              disabled={inviting}
              style={{
                background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0',
                borderRadius: 3, padding: '6px 10px', cursor: inviting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}
            >
              <UserPlus size={11} /> Invite
            </button>
          </div>
          {inviteError && <p style={{ color: '#c0504a', fontSize: '0.65rem', marginTop: 6 }}>{inviteError}</p>}
        </div>

        {/* Collaborator list */}
        {collaborators.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #2a2218', paddingTop: '1rem' }}>
            <p style={label}>Collaborators</p>
            {collaborators.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                <span style={{ color: '#9a9088', fontSize: '0.75rem' }}>{c.invitee_email}</span>
                <button
                  onClick={() => removeCollaborator(c.id)}
                  style={{ color: '#5a5048', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#c0504a' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5048' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
