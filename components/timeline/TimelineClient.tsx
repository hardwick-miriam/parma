'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimelineEvent } from '@/types'
import { Plus, Trash2, GripVertical } from 'lucide-react'

type Props = {
  folderId: string
  userId: string
  initialEvents: TimelineEvent[]
}

export default function TimelineClient({ folderId, userId, initialEvents }: Props) {
  const supabase = createClient()
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', story_date: '', description: '' })
  const [saving, setSaving] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  const addEvent = async () => {
    if (!draft.title.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('timeline_events')
      .insert({ folder_id: folderId, user_id: userId, ...draft, position: events.length })
      .select()
      .single()
    setSaving(false)
    if (data) {
      setEvents(prev => [...prev, data])
      setDraft({ title: '', story_date: '', description: '' })
      setAdding(false)
    }
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('timeline_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const onDragStart = (i: number) => { dragIndex.current = i }
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); dragOverIndex.current = i }

  const onDrop = async () => {
    const from = dragIndex.current
    const to = dragOverIndex.current
    if (from === null || to === null || from === to) return
    const reordered = [...events]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((ev, i) => ({ ...ev, position: i }))
    setEvents(updated)
    dragIndex.current = null
    dragOverIndex.current = null
    await Promise.all(
      updated.map(ev => supabase.from('timeline_events').update({ position: ev.position }).eq('id', ev.id))
    )
  }

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const border = '#2a2218'
  const cardBg = '#1a1510'

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111', border: `1px solid ${border}`,
    color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: ink, fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 300 }}>
          Story Timeline
        </h2>
        <button
          onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0',
            borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}
        >
          <Plus size={11} /> Add event
        </button>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {events.length > 0 && (
          <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, background: border }} />
        )}

        {events.map((ev, i) => (
          <div
            key={ev.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={onDrop}
            style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}
          >
            <div style={{ width: 33, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                background: '#6b2737', border: '2px solid #a06878', marginTop: 14, flexShrink: 0,
              }} />
            </div>

            <div style={{ flex: 1, background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ color: ink, fontSize: '0.78rem', fontWeight: 400, letterSpacing: '0.03em' }}>{ev.title}</span>
                  {ev.story_date && (
                    <span style={{ color: dim, fontSize: '0.65rem', marginLeft: 8, letterSpacing: '0.06em' }}>{ev.story_date}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button style={{ color: '#3a3228', background: 'none', border: 'none', cursor: 'grab', padding: 2, display: 'flex' }} onMouseDown={e => e.preventDefault()}>
                    <GripVertical size={11} />
                  </button>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    style={{ color: '#3a3228', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#3a3228' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              {ev.description && (
                <p style={{ color: dim, fontSize: '0.7rem', marginTop: 4, lineHeight: 1.5 }}>{ev.description}</p>
              )}
            </div>
          </div>
        ))}

        {events.length === 0 && !adding && (
          <p style={{ color: dim, fontSize: '0.72rem', textAlign: 'center', padding: '3rem 0', letterSpacing: '0.06em' }}>
            No events yet. Add your first story milestone.
          </p>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '1rem', marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              placeholder="Event title"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addEvent() }}
              style={inputStyle}
            />
            <input
              placeholder="Story date (e.g. Year 3, Day 14)"
              value={draft.story_date}
              onChange={e => setDraft(d => ({ ...d, story_date: e.target.value }))}
              style={inputStyle}
            />
            <textarea
              placeholder="Description (optional)"
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setAdding(false); setDraft({ title: '', story_date: '', description: '' }) }}
                style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '5px 12px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={addEvent}
                disabled={saving}
                style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '5px 12px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
