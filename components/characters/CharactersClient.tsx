'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterRelationship, CharacterPosition } from '@/types'
import { Plus, X, Link as LinkIcon } from 'lucide-react'

type Props = {
  folderId: string
  userId: string
  initialRelationships: CharacterRelationship[]
  initialPositions: CharacterPosition[]
}

export default function CharactersClient({ folderId, userId, initialRelationships, initialPositions }: Props) {
  const supabase = createClient()
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(initialPositions.map(p => [p.character_name, { x: p.x_pos, y: p.y_pos }]))
  )
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(initialRelationships)
  const [addingChar, setAddingChar] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [addingRel, setAddingRel] = useState(false)
  const [newRel, setNewRel] = useState({ from: '', to: '', label: '' })
  const dragging = useRef<{ name: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const characters = Array.from(positions.keys())

  const addCharacter = async () => {
    const name = newCharName.trim()
    if (!name || positions.has(name)) return
    const x = 120 + Math.random() * 560
    const y = 80 + Math.random() * 280
    setPositions(prev => new Map(prev).set(name, { x, y }))
    setNewCharName('')
    setAddingChar(false)
    await supabase.from('character_positions').upsert(
      { folder_id: folderId, user_id: userId, character_name: name, x_pos: x, y_pos: y },
      { onConflict: 'folder_id,user_id,character_name' }
    )
  }

  const removeCharacter = async (name: string) => {
    const next = new Map(positions)
    next.delete(name)
    setPositions(next)
    setRelationships(prev => prev.filter(r => r.from_name !== name && r.to_name !== name))
    await supabase.from('character_positions').delete()
      .eq('folder_id', folderId).eq('user_id', userId).eq('character_name', name)
    await supabase.from('character_relationships').delete()
      .eq('folder_id', folderId).or(`from_name.eq.${name},to_name.eq.${name}`)
  }

  const addRelationship = async () => {
    const { from, to, label } = newRel
    if (!from || !to || from === to) return
    const { data } = await supabase
      .from('character_relationships')
      .insert({ folder_id: folderId, user_id: userId, from_name: from, to_name: to, label })
      .select()
      .single()
    if (data) {
      setRelationships(prev => [...prev, data])
      setNewRel({ from: '', to: '', label: '' })
      setAddingRel(false)
    }
  }

  const removeRelationship = async (id: string) => {
    await supabase.from('character_relationships').delete().eq('id', id)
    setRelationships(prev => prev.filter(r => r.id !== id))
  }

  const onMouseDown = (name: string, e: React.MouseEvent) => {
    e.preventDefault()
    const pos = positions.get(name)!
    dragging.current = { name, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const { name, startX, startY, origX, origY } = dragging.current
      const x = Math.max(50, origX + e.clientX - startX)
      const y = Math.max(30, origY + e.clientY - startY)
      setPositions(prev => new Map(prev).set(name, { x, y }))
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      const { name } = dragging.current
      dragging.current = null
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setPositions(prev => {
          const pos = prev.get(name)
          if (pos) {
            supabase.from('character_positions').upsert(
              { folder_id: folderId, user_id: userId, character_name: name, x_pos: pos.x, y_pos: pos.y },
              { onConflict: 'folder_id,user_id,character_name' }
            )
          }
          return prev
        })
      }, 600)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [folderId, userId, supabase])

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const border = '#2a2218'
  const cardBg = '#1a1510'
  const selectStyle: React.CSSProperties = {
    background: '#111', border: `1px solid ${border}`, color: ink,
    fontSize: '0.75rem', padding: '6px 8px', borderRadius: 3,
  }

  const canvasH = Math.max(400, ...Array.from(positions.values()).map(p => p.y + 60))

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setAddingChar(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}
        >
          <Plus size={11} /> Add character
        </button>
        {characters.length >= 2 && (
          <button
            onClick={() => setAddingRel(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}
          >
            <LinkIcon size={11} /> Add relationship
          </button>
        )}
      </div>

      {addingChar && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <input
            autoFocus
            placeholder="Character name"
            value={newCharName}
            onChange={e => setNewCharName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCharacter(); if (e.key === 'Escape') setAddingChar(false) }}
            style={{ flex: 1, background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none' }}
          />
          <button onClick={addCharacter} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}>Add</button>
          <button onClick={() => { setAddingChar(false); setNewCharName('') }} style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {addingRel && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={newRel.from} onChange={e => setNewRel(r => ({ ...r, from: e.target.value }))} style={selectStyle}>
              <option value="">From…</option>
              {characters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ color: dim, fontSize: '0.8rem' }}>→</span>
            <select value={newRel.to} onChange={e => setNewRel(r => ({ ...r, to: e.target.value }))} style={selectStyle}>
              <option value="">To…</option>
              {characters.filter(c => c !== newRel.from).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              placeholder="Relationship label"
              value={newRel.label}
              onChange={e => setNewRel(r => ({ ...r, label: e.target.value }))}
              style={{ flex: 1, minWidth: 120, background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none' }}
            />
            <button onClick={addRelationship} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '6px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setAddingRel(false)} style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '6px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {characters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: dim, fontSize: '0.72rem', letterSpacing: '0.06em' }}>
          Add characters to build your relationship map.
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: canvasH, background: '#111008', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
          {/* SVG lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4a3228" />
              </marker>
            </defs>
            {relationships.map(rel => {
              const from = positions.get(rel.from_name)
              const to = positions.get(rel.to_name)
              if (!from || !to) return null
              return (
                <g key={rel.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#3a2a1a" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {rel.label && (
                    <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5} textAnchor="middle" fill="#5a4a38" fontSize="10" fontFamily="Inter, sans-serif">
                      {rel.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {Array.from(positions.entries()).map(([name, { x, y }]) => (
            <div
              key={name}
              onMouseDown={e => onMouseDown(name, e)}
              style={{
                position: 'absolute', transform: 'translate(-50%, -50%)',
                left: x, top: y,
                background: '#1e1812', border: '1px solid #4a3228',
                borderRadius: 24, padding: '6px 14px',
                cursor: 'grab', userSelect: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}
            >
              <span style={{ color: ink, fontSize: '0.72rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{name}</span>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => removeCharacter(name)}
                style={{ color: '#3a2a1a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3a2a1a' }}
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {relationships.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ color: dim, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Relationships</p>
          {relationships.map(rel => (
            <div key={rel.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${border}` }}>
              <span style={{ color: ink, fontSize: '0.72rem' }}>{rel.from_name}</span>
              <span style={{ color: dim, fontSize: '0.65rem' }}>→</span>
              <span style={{ color: ink, fontSize: '0.72rem' }}>{rel.to_name}</span>
              {rel.label && <span style={{ color: dim, fontSize: '0.65rem', fontStyle: 'italic' }}>({rel.label})</span>}
              <button
                onClick={() => removeRelationship(rel.id)}
                style={{ marginLeft: 'auto', color: '#3a3228', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3a3228' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
