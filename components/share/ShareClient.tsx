'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document, Comment } from '@/types'
import { Send } from 'lucide-react'

type ProseMirrorNode = {
  type: string
  content?: ProseMirrorLeaf[]
}

type ProseMirrorLeaf = {
  type: string
  text?: string
  marks?: Array<{ type: string }>
}

function renderContent(content: object | null): string {
  if (!content) return ''
  try {
    const root = content as { content?: ProseMirrorNode[] }
    return (root.content || []).map(node => {
      const inline = (node.content || []).map(leaf => {
        let t = (leaf.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (leaf.marks) {
          for (const m of leaf.marks) {
            if (m.type === 'bold') t = `<strong>${t}</strong>`
            if (m.type === 'italic') t = `<em>${t}</em>`
            if (m.type === 'underline') t = `<u>${t}</u>`
          }
        }
        return t
      }).join('')
      if (node.type === 'paragraph') return `<p>${inline || '&nbsp;'}</p>`
      return inline ? `<p>${inline}</p>` : ''
    }).join('')
  } catch { return '' }
}

type Props = {
  document: Document
  initialComments: Comment[]
}

export default function ShareClient({ document: doc, initialComments }: Props) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [commentText, setCommentText] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const postComment = async () => {
    const text = commentText.trim()
    if (!text) return
    setPosting(true)
    setError('')
    const { data, error: err } = await supabase
      .from('comments')
      .insert({ document_id: doc.id, user_email: commentEmail.trim() || null, content: text })
      .select()
      .single()
    setPosting(false)
    if (err) { setError('Failed to post comment'); return }
    if (data) { setComments(prev => [...prev, data]); setCommentText('') }
  }

  const ink = '#e8dfc8'
  const dim = '#7a6a58'
  const border = '#2a2218'
  const cardBg = '#1a1510'
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111', border: `1px solid ${border}`,
    color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0c09', color: ink, fontFamily: 'Inter, sans-serif' }}>
      <header style={{ borderBottom: `1px solid ${border}`, background: '#120f0b' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="Parma" style={{ height: 26, filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.45 }} />
          <span style={{ color: dim, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Shared document</span>
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
        {doc.title && (
          <h1 style={{
            fontFamily: 'var(--font-garamond), Georgia, serif',
            fontSize: '1.9rem', fontWeight: 400, letterSpacing: '0.04em',
            color: '#f0e8d0', marginBottom: '2.5rem', textAlign: 'center', lineHeight: 1.3,
          }}>
            {doc.title}
          </h1>
        )}
        <div
          className="reading-content"
          dangerouslySetInnerHTML={{ __html: renderContent(doc.content) }}
          style={{ color: '#d8cbb4', lineHeight: 1.9 }}
        />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem 4rem', borderTop: `1px solid ${border}` }}>
        <h2 style={{ color: dim, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Comments ({comments.length})
        </h2>

        {comments.map(c => (
          <div key={c.id} style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: cardBg, border: `1px solid ${border}`, borderRadius: 3 }}>
            {c.user_email && <p style={{ color: dim, fontSize: '0.65rem', marginBottom: 4 }}>{c.user_email}</p>}
            <p style={{ color: ink, fontSize: '0.8rem', lineHeight: 1.6 }}>{c.content}</p>
            <p style={{ color: '#3a3228', fontSize: '0.6rem', marginTop: 6 }}>
              {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}

        <div style={{ marginTop: '1.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '1rem' }}>
          <input
            type="email"
            placeholder="Your email (optional)"
            value={commentEmail}
            onChange={e => setCommentEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              placeholder="Leave a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={2}
              style={{ ...inputStyle, flex: 1, resize: 'none' }}
            />
            <button
              onClick={postComment}
              disabled={posting || !commentText.trim()}
              style={{
                background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0',
                borderRadius: 3, padding: '0 14px', cursor: commentText.trim() ? 'pointer' : 'default',
                flexShrink: 0, opacity: !commentText.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center',
              }}
            >
              <Send size={13} />
            </button>
          </div>
          {error && <p style={{ color: '#c0504a', fontSize: '0.65rem', marginTop: 6 }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}
