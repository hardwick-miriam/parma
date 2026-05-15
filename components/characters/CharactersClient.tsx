'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterRelationship, CharacterPosition, RelationshipType, Faction, WorldbuildingEntry } from '@/types'
import { Plus, X, Link as LinkIcon, ZoomIn, ZoomOut, Maximize2, Minimize2, Users, Settings2, Filter } from 'lucide-react'

type Transform = { zoom: number; panX: number; panY: number }

type Props = {
  folderId: string
  userId: string
  initialRelationships: CharacterRelationship[]
  initialPositions: CharacterPosition[]
  initialRelTypes: RelationshipType[]
  initialFactions: Faction[]
  initialCharMeta: WorldbuildingEntry[]
}

const STATUS_COLORS: Record<string, string> = {
  alive: '#4a9a5a',
  dead: '#9a4a4a',
  unknown: '#7a7a7a',
  missing: '#9a7a3a',
}

const REL_TYPE_PRESETS = [
  { name: 'Family', color: '#9a6a3a' },
  { name: 'Ally', color: '#3a7a4a' },
  { name: 'Enemy', color: '#9a3a3a' },
  { name: 'Romantic', color: '#9a3a6a' },
  { name: 'Mentor', color: '#3a5a9a' },
  { name: 'Rival', color: '#6a3a9a' },
]

export default function CharactersClient({
  folderId, userId,
  initialRelationships, initialPositions,
  initialRelTypes, initialFactions, initialCharMeta,
}: Props) {
  const supabase = createClient()

  // Core map state
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(initialPositions.map(p => [p.character_name, { x: p.x_pos, y: p.y_pos }]))
  )
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(initialRelationships)
  const [relTypes, setRelTypes] = useState<RelationshipType[]>(initialRelTypes)
  const [factions, setFactions] = useState<Faction[]>(initialFactions)
  const [charMeta, setCharMeta] = useState<Map<string, WorldbuildingEntry>>(
    () => new Map(initialCharMeta.map(e => [e.name, e]))
  )

  // UI state
  const [addingChar, setAddingChar] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [addingRel, setAddingRel] = useState(false)
  const [newRel, setNewRel] = useState({ from: '', to: '', label: '', color: '#c0c0c0', type_id: '' })
  const [filterTypeId, setFilterTypeId] = useState<string | null>(null)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; charName: string } | null>(null)
  const [showFactionManager, setShowFactionManager] = useState(false)
  const [newFaction, setNewFaction] = useState({ name: '', color: '#c0c0c0' })
  const [addingRelType, setAddingRelType] = useState(false)
  const [newRelType, setNewRelType] = useState({ name: '', color: '#c0c0c0' })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  // Transform
  const [transform, setTransform] = useState<Transform>({ zoom: 1, panX: 0, panY: 0 })
  const transformRef = useRef<Transform>({ zoom: 1, panX: 0, panY: 0 })
  const updateTransform = useCallback((fn: (prev: Transform) => Transform) => {
    setTransform(prev => {
      const next = fn(prev)
      transformRef.current = next
      return next
    })
  }, [])

  const dragging = useRef<{ name: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const panning = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const characters = Array.from(positions.keys())

  // Faction bounds for cluster rendering
  const factionBounds = useMemo(() => {
    const bounds = new Map<string, { minX: number; minY: number; maxX: number; maxY: number; count: number }>()
    for (const [name, pos] of positions) {
      const meta = charMeta.get(name)
      if (!meta?.faction_id) continue
      const fid = meta.faction_id
      const existing = bounds.get(fid)
      if (!existing) {
        bounds.set(fid, { minX: pos.x, minY: pos.y, maxX: pos.x, maxY: pos.y, count: 1 })
      } else {
        bounds.set(fid, {
          minX: Math.min(existing.minX, pos.x),
          minY: Math.min(existing.minY, pos.y),
          maxX: Math.max(existing.maxX, pos.x),
          maxY: Math.max(existing.maxY, pos.y),
          count: existing.count + 1,
        })
      }
    }
    return bounds
  }, [positions, charMeta])

  // Filtered relationships
  const visibleRels = useMemo(() =>
    filterTypeId ? relationships.filter(r => r.type_id === filterTypeId) : relationships,
    [relationships, filterTypeId]
  )

  const canvasH = Math.max(420, ...Array.from(positions.values()).map(p => p.y + 80))

  // ── Character CRUD ───────────────────────────────────────────────────────────

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
    if (selectedChar === name) setSelectedChar(null)
    const next = new Map(positions)
    next.delete(name)
    setPositions(next)
    setRelationships(prev => prev.filter(r => r.from_name !== name && r.to_name !== name))
    await supabase.from('character_positions').delete()
      .eq('folder_id', folderId).eq('user_id', userId).eq('character_name', name)
    await supabase.from('character_relationships').delete()
      .eq('folder_id', folderId).or(`from_name.eq.${name},to_name.eq.${name}`)
  }

  // ── Relationship CRUD ────────────────────────────────────────────────────────

  const addRelationship = async () => {
    const { from, to, label, color, type_id } = newRel
    if (!from || !to || from === to) return
    const payload: Record<string, unknown> = {
      folder_id: folderId, user_id: userId, from_name: from, to_name: to, label, color,
    }
    if (type_id) payload.type_id = type_id
    const { data } = await supabase.from('character_relationships').insert(payload).select().single()
    if (data) {
      setRelationships(prev => [...prev, data])
      setNewRel({ from: '', to: '', label: '', color: '#c0c0c0', type_id: '' })
      setAddingRel(false)
    }
  }

  const removeRelationship = async (id: string) => {
    await supabase.from('character_relationships').delete().eq('id', id)
    setRelationships(prev => prev.filter(r => r.id !== id))
  }

  // ── Relationship types ───────────────────────────────────────────────────────

  const addRelType = async () => {
    const name = newRelType.name.trim()
    if (!name) return
    const { data } = await supabase.from('relationship_types')
      .insert({ folder_id: folderId, user_id: userId, name, color: newRelType.color })
      .select().single()
    if (data) {
      setRelTypes(prev => [...prev, data])
      setNewRelType({ name: '', color: '#c0c0c0' })
      setAddingRelType(false)
    }
  }

  const removeRelType = async (id: string) => {
    await supabase.from('relationship_types').delete().eq('id', id)
    setRelTypes(prev => prev.filter(t => t.id !== id))
    if (filterTypeId === id) setFilterTypeId(null)
  }

  // ── Factions ─────────────────────────────────────────────────────────────────

  const addFaction = async () => {
    const name = newFaction.name.trim()
    if (!name) return
    const { data } = await supabase.from('factions')
      .insert({ folder_id: folderId, user_id: userId, name, color: newFaction.color })
      .select().single()
    if (data) {
      setFactions(prev => [...prev, data])
      setNewFaction({ name: '', color: '#c0c0c0' })
    }
  }

  const removeFaction = async (id: string) => {
    await supabase.from('factions').delete().eq('id', id)
    setFactions(prev => prev.filter(f => f.id !== id))
    setCharMeta(prev => {
      const next = new Map(prev)
      for (const [k, v] of next) {
        if (v.faction_id === id) next.set(k, { ...v, faction_id: null })
      }
      return next
    })
  }

  const assignFaction = async (charName: string, factionId: string | null) => {
    const existing = charMeta.get(charName)
    if (existing) {
      await supabase.from('worldbuilding_entries').update({ faction_id: factionId }).eq('id', existing.id)
      setCharMeta(prev => new Map(prev).set(charName, { ...existing, faction_id: factionId }))
    } else {
      const { data } = await supabase.from('worldbuilding_entries')
        .insert({ folder_id: folderId, user_id: userId, section: 'characters', name: charName, content: '', faction_id: factionId, status: 'alive' })
        .select().single()
      if (data) setCharMeta(prev => new Map(prev).set(charName, data))
    }
    setContextMenu(null)
  }

  // ── Character metadata ───────────────────────────────────────────────────────

  const upsertCharMeta = async (charName: string, changes: Partial<WorldbuildingEntry>) => {
    const existing = charMeta.get(charName)
    if (existing) {
      await supabase.from('worldbuilding_entries').update(changes).eq('id', existing.id)
      setCharMeta(prev => new Map(prev).set(charName, { ...existing, ...changes }))
    } else {
      const { data } = await supabase.from('worldbuilding_entries')
        .insert({ folder_id: folderId, user_id: userId, section: 'characters' as const, name: charName, content: '', status: 'alive', ...changes })
        .select().single()
      if (data) setCharMeta(prev => new Map(prev).set(charName, data))
    }
  }

  const uploadPortrait = async (charName: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${folderId}/${charName.replace(/[^a-z0-9]/gi, '_')}.${ext}`
    const { error } = await supabase.storage.from('character-portraits').upload(path, file, { upsert: true })
    if (error) return
    const { data: urlData } = supabase.storage.from('character-portraits').getPublicUrl(path)
    await upsertCharMeta(charName, { portrait_url: urlData.publicUrl })
  }

  // ── Drag and pan ─────────────────────────────────────────────────────────────

  const onCharMouseDown = (name: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = positions.get(name)!
    dragging.current = { name, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    panning.current = { startX: e.clientX, startY: e.clientY, origPanX: transformRef.current.panX, origPanY: transformRef.current.panY }
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        const { name, startX, startY, origX, origY } = dragging.current
        const z = transformRef.current.zoom
        setPositions(prev => new Map(prev).set(name, {
          x: Math.max(50, origX + (e.clientX - startX) / z),
          y: Math.max(30, origY + (e.clientY - startY) / z),
        }))
      } else if (panning.current) {
        const { startX, startY, origPanX, origPanY } = panning.current
        updateTransform(prev => ({ ...prev, panX: origPanX + e.clientX - startX, panY: origPanY + e.clientY - startY }))
      }
    }
    const onMouseUp = () => {
      if (dragging.current) {
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
      panning.current = null
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [folderId, userId, supabase, updateTransform])

  // ── Wheel zoom ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      updateTransform(prev => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.25, Math.min(4, prev.zoom * factor))
        const sceneX = (cx - prev.panX) / prev.zoom
        const sceneY = (cy - prev.panY) / prev.zoom
        return { zoom: newZoom, panX: cx - sceneX * newZoom, panY: cy - sceneY * newZoom }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [updateTransform])

  // ── Fullscreen ───────────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Context menu close on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  // ── Styles ───────────────────────────────────────────────────────────────────

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const border = '#2a2218'
  const cardBg = '#1a1510'
  const selectStyle: React.CSSProperties = { background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.75rem', padding: '6px 8px', borderRadius: 3 }

  const toolbarBtn = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6,
    background: active ? '#2d1520' : 'transparent',
    border: `1px solid ${active ? '#6b2737' : border}`,
    color: active ? '#a8a8b0' : dim,
    borderRadius: 3, padding: '5px 10px', fontSize: '0.68rem', cursor: 'pointer',
  })

  const zoomPct = Math.round(transform.zoom * 100)

  return (
    <div style={{ padding: '1.5rem' }} onClick={() => setContextMenu(null)}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setAddingChar(true)} style={{ ...toolbarBtn(), background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#a8a8b0' }}>
          <Plus size={11} /> Add character
        </button>
        {characters.length >= 2 && (
          <button onClick={() => setAddingRel(true)} style={toolbarBtn()}>
            <LinkIcon size={11} /> Add relationship
          </button>
        )}
        {relTypes.length > 0 && (
          <button onClick={() => setShowLegend(v => !v)} style={toolbarBtn(showLegend)}>
            <Filter size={11} /> {showLegend ? 'Hide' : 'Legend'}
          </button>
        )}
        <button onClick={() => setAddingRelType(v => !v)} style={toolbarBtn(addingRelType)}>
          <Plus size={11} /> Rel. type
        </button>
        <button onClick={() => setShowFactionManager(v => !v)} style={toolbarBtn(showFactionManager)}>
          <Users size={11} /> Factions
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => updateTransform(p => ({ ...p, zoom: Math.max(0.25, p.zoom - 0.15) }))} style={{ ...toolbarBtn(), padding: '5px 8px' }}>
            <ZoomOut size={11} />
          </button>
          <span style={{ color: dim, fontSize: '0.65rem', minWidth: 36, textAlign: 'center' }}>{zoomPct}%</span>
          <button onClick={() => updateTransform(p => ({ ...p, zoom: Math.min(4, p.zoom + 0.15) }))} style={{ ...toolbarBtn(), padding: '5px 8px' }}>
            <ZoomIn size={11} />
          </button>
          <button onClick={() => updateTransform(() => ({ zoom: 1, panX: 0, panY: 0 }))} style={{ ...toolbarBtn(), padding: '5px 8px', fontSize: '0.62rem' }}>
            Reset
          </button>
          <button onClick={toggleFullscreen} style={{ ...toolbarBtn(), padding: '5px 8px' }}>
            {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
        </div>
      </div>

      {/* ── Add character input ── */}
      {addingChar && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <input
            autoFocus placeholder="Character name" value={newCharName}
            onChange={e => setNewCharName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCharacter(); if (e.key === 'Escape') setAddingChar(false) }}
            style={{ flex: 1, background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none' }}
          />
          <button onClick={addCharacter} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}>Add</button>
          <button onClick={() => { setAddingChar(false); setNewCharName('') }} style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* ── Add relationship type ── */}
      {addingRelType && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '0.75rem', marginBottom: '0.75rem' }}>
          <p style={{ color: dim, fontSize: '0.63rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>New relationship type</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Type name" value={newRelType.name}
              onChange={e => setNewRelType(r => ({ ...r, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addRelType()}
              style={{ flex: 1, minWidth: 120, ...selectStyle }} />
            {REL_TYPE_PRESETS.map(p => (
              <button key={p.name} onClick={() => setNewRelType({ name: p.name, color: p.color })}
                title={p.name}
                style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, border: newRelType.color === p.color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
            ))}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="Custom colour">
              <input type="color" value={newRelType.color}
                onChange={e => setNewRelType(r => ({ ...r, color: e.target.value }))}
                style={{ width: 28, height: 26, border: `1px solid ${border}`, borderRadius: 3, padding: 2, background: 'transparent', cursor: 'pointer' }} />
            </label>
            <button onClick={addRelType} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setAddingRelType(false)} style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Add relationship form ── */}
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
            {relTypes.length > 0 && (
              <select value={newRel.type_id}
                onChange={e => {
                  const tid = e.target.value
                  const rt = relTypes.find(r => r.id === tid)
                  setNewRel(r => ({ ...r, type_id: tid, color: rt?.color || r.color, label: rt ? (r.label || rt.name) : r.label }))
                }}
                style={selectStyle}>
                <option value="">Type…</option>
                {relTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <input placeholder="Label" value={newRel.label}
              onChange={e => setNewRel(r => ({ ...r, label: e.target.value }))}
              style={{ flex: 1, minWidth: 100, background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.75rem', padding: '6px 10px', borderRadius: 3, outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="Line colour">
              <input type="color" value={newRel.color}
                onChange={e => setNewRel(r => ({ ...r, color: e.target.value }))}
                style={{ width: 30, height: 28, border: `1px solid ${border}`, borderRadius: 3, padding: 2, background: 'transparent', cursor: 'pointer' }} />
            </label>
            <button onClick={addRelationship} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '6px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setAddingRel(false)} style={{ background: 'none', border: `1px solid ${border}`, color: dim, borderRadius: 3, padding: '6px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Legend & filter ── */}
      {showLegend && relTypes.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setFilterTypeId(null)}
            style={{ ...toolbarBtn(!filterTypeId), padding: '3px 8px', fontSize: '0.63rem' }}>All</button>
          {relTypes.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setFilterTypeId(filterTypeId === t.id ? null : t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: filterTypeId === t.id ? '#1e1510' : 'transparent', border: `1px solid ${filterTypeId === t.id ? t.color + '80' : border}`, color: filterTypeId === t.id ? t.color : dim, borderRadius: 3, padding: '3px 8px', fontSize: '0.63rem', cursor: 'pointer' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0, display: 'inline-block' }} />
                {t.name}
              </button>
              <button onClick={() => removeRelType(t.id)} style={{ color: '#3a2a1a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3a2a1a' }}>
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Faction manager ── */}
      {showFactionManager && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 3, padding: '0.75rem', marginBottom: '0.75rem' }}>
          <p style={{ color: dim, fontSize: '0.63rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Factions — right-click a character to assign</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            {factions.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: f.color + '18', border: `1px solid ${f.color}40`, borderRadius: 12, padding: '3px 10px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                <span style={{ color: ink, fontSize: '0.68rem' }}>{f.name}</span>
                <button onClick={() => removeFaction(f.id)} style={{ color: '#3a2a1a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: 2 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#3a2a1a' }}>
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input placeholder="New faction name" value={newFaction.name}
              onChange={e => setNewFaction(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addFaction()}
              style={{ flex: 1, ...selectStyle }} />
            <label style={{ cursor: 'pointer' }}>
              <input type="color" value={newFaction.color} onChange={e => setNewFaction(f => ({ ...f, color: e.target.value }))}
                style={{ width: 28, height: 26, border: `1px solid ${border}`, borderRadius: 3, padding: 2, background: 'transparent', cursor: 'pointer' }} />
            </label>
            <button onClick={addFaction} style={{ background: '#2d1520', border: '1px solid #6b2737', color: '#a8a8b0', borderRadius: 3, padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      {characters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: dim, fontSize: '0.72rem', letterSpacing: '0.06em' }}>
          Add characters to build your relationship map.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            onMouseDown={onCanvasMouseDown}
            onContextMenu={e => e.preventDefault()}
            style={{
              position: 'relative', width: '100%',
              height: isFullscreen ? '100vh' : canvasH,
              background: '#111008', border: `1px solid ${border}`, borderRadius: 4,
              overflow: 'hidden', cursor: panning.current ? 'grabbing' : 'grab',
            }}
          >
            {/* Transformed scene */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
              transformOrigin: '0 0',
            }}>
              {/* SVG layer */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                  {visibleRels.map(rel => {
                    const color = rel.color || '#c0c0c0'
                    return (
                      <marker key={rel.id} id={`arrow-${rel.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill={color} opacity="0.75" />
                      </marker>
                    )
                  })}
                </defs>

                {/* Faction blobs */}
                {Array.from(factionBounds).map(([factionId, bounds]) => {
                  const faction = factions.find(f => f.id === factionId)
                  if (!faction || bounds.count < 1) return null
                  const pad = 44
                  return (
                    <g key={factionId}>
                      <rect
                        x={bounds.minX - pad} y={bounds.minY - pad}
                        width={Math.max(80, bounds.maxX - bounds.minX + pad * 2)}
                        height={Math.max(60, bounds.maxY - bounds.minY + pad * 2)}
                        rx={16} fill={faction.color + '14'} stroke={faction.color + '35'} strokeWidth={1} strokeDasharray="4 3"
                      />
                      <text
                        x={(bounds.minX + bounds.maxX) / 2} y={bounds.minY - pad + 13}
                        textAnchor="middle" fill={faction.color} opacity={0.65} fontSize={9}
                        fontFamily="Inter, sans-serif" letterSpacing={1.2}>
                        {faction.name.toUpperCase()}
                      </text>
                    </g>
                  )
                })}

                {/* Relationship lines */}
                {visibleRels.map(rel => {
                  const from = positions.get(rel.from_name)
                  const to = positions.get(rel.to_name)
                  if (!from || !to) return null
                  const color = rel.color || '#c0c0c0'
                  return (
                    <g key={rel.id}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={color} strokeWidth="1.5" opacity="0.7"
                        markerEnd={`url(#arrow-${rel.id})`} />
                      {rel.label && (
                        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                          textAnchor="middle" fill={color} opacity="0.65"
                          fontSize="10" fontFamily="Inter, sans-serif">
                          {rel.label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Character nodes */}
              {Array.from(positions.entries()).map(([name, { x, y }]) => {
                const meta = charMeta.get(name)
                const status = meta?.status || null
                const portraitUrl = meta?.portrait_url || null
                const isSelected = selectedChar === name
                return (
                  <div
                    key={name}
                    onMouseDown={e => onCharMouseDown(name, e)}
                    onClick={e => { e.stopPropagation(); setSelectedChar(isSelected ? null : name) }}
                    onContextMenu={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setContextMenu({ x: e.clientX, y: e.clientY, charName: name })
                    }}
                    style={{
                      position: 'absolute', transform: 'translate(-50%, -50%)',
                      left: x, top: y,
                      background: isSelected ? '#2a1f18' : '#1e1812',
                      border: `1px solid ${isSelected ? '#6b2737' : '#4a3228'}`,
                      borderRadius: 24, padding: '6px 12px 6px 8px',
                      cursor: 'grab', userSelect: 'none',
                      display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: isSelected ? '0 0 0 2px #6b273740' : '0 2px 12px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Portrait or initial circle */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={portraitUrl} alt={name}
                          style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid #4a3228' }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2a2218', border: '1px solid #4a3228', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#6a5a48', fontSize: '0.65rem', fontWeight: 600 }}>{name[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      {status && (
                        <div style={{
                          position: 'absolute', bottom: 0, right: -1,
                          width: 8, height: 8, borderRadius: '50%',
                          background: STATUS_COLORS[status] || '#7a7a7a',
                          border: '1.5px solid #1e1812',
                        }} />
                      )}
                    </div>
                    <span style={{ color: ink, fontSize: '0.72rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{name}</span>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); removeCharacter(name) }}
                      style={{ color: '#3a2a1a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#3a2a1a' }}>
                      <X size={9} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Zoom hint */}
            <div style={{ position: 'absolute', bottom: 8, left: 10, color: '#2a2218', fontSize: '0.6rem', pointerEvents: 'none' }}>
              Scroll to zoom · Drag to pan · Right-click node for factions
            </div>
          </div>

          {/* ── Detail panel ── */}
          {selectedChar && (() => {
            const meta = charMeta.get(selectedChar)
            const charRels = relationships.filter(r => r.from_name === selectedChar || r.to_name === selectedChar)
            return (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', right: 0, top: 0,
                  width: 220, height: '100%',
                  background: 'rgba(16,11,7,0.97)',
                  borderLeft: `1px solid ${border}`,
                  borderRadius: '0 4px 4px 0',
                  padding: '1rem',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  overflowY: 'auto', zIndex: 10,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: dim, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Character</span>
                  <button onClick={() => setSelectedChar(null)}
                    style={{ color: dim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={12} />
                  </button>
                </div>

                {/* Portrait */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => { setUploadingFor(selectedChar); fileInputRef.current?.click() }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Upload portrait">
                    {meta?.portrait_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meta.portrait_url} alt={selectedChar}
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${border}` }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e1812', border: `1px dashed ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                        <Plus size={14} color={dim} />
                        <span style={{ color: dim, fontSize: '0.55rem' }}>Portrait</span>
                      </div>
                    )}
                  </button>
                  <span style={{ color: ink, fontSize: '0.8rem', fontWeight: 400, letterSpacing: '0.04em', textAlign: 'center' }}>{selectedChar}</span>
                </div>

                {/* Status */}
                <div>
                  <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Status</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(['alive', 'dead', 'unknown', 'missing'] as const).map(s => (
                      <button key={s}
                        onClick={() => upsertCharMeta(selectedChar, { status: s })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '3px 7px', borderRadius: 10, fontSize: '0.62rem',
                          background: meta?.status === s ? STATUS_COLORS[s] + '25' : 'transparent',
                          border: `1px solid ${meta?.status === s ? STATUS_COLORS[s] + '80' : border}`,
                          color: meta?.status === s ? STATUS_COLORS[s] : dim,
                          cursor: 'pointer',
                        }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[s], flexShrink: 0 }} />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Faction */}
                {factions.length > 0 && (
                  <div>
                    <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Faction</p>
                    <select
                      value={meta?.faction_id || ''}
                      onChange={e => upsertCharMeta(selectedChar, { faction_id: e.target.value || null })}
                      style={{ ...selectStyle, width: '100%', fontSize: '0.7rem' }}>
                      <option value="">No faction</option>
                      {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</p>
                  <textarea
                    value={meta?.content || ''}
                    onChange={e => upsertCharMeta(selectedChar, { content: e.target.value })}
                    rows={4}
                    style={{ width: '100%', background: '#111', border: `1px solid ${border}`, color: ink, fontSize: '0.68rem', padding: '6px 8px', borderRadius: 3, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>

                {/* Relationships */}
                {charRels.length > 0 && (
                  <div>
                    <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Relationships</p>
                    {charRels.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', borderBottom: `1px solid ${border}` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color || '#c0c0c0', flexShrink: 0 }} />
                        <span style={{ color: dim, fontSize: '0.62rem', flex: 1 }}>
                          {r.from_name === selectedChar ? `→ ${r.to_name}` : `← ${r.from_name}`}
                          {r.label && <em> ({r.label})</em>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Faction context menu ── */}
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000,
            background: '#1a1510', border: `1px solid ${border}`, borderRadius: 4,
            padding: '4px 0', minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}>
          <p style={{ color: dim, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px 6px', borderBottom: `1px solid ${border}` }}>
            Assign faction
          </p>
          <button onClick={() => assignFaction(contextMenu.charName, null)}
            style={{ width: '100%', textAlign: 'left', padding: '5px 10px', background: 'none', border: 'none', color: dim, fontSize: '0.7rem', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2218'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            No faction
          </button>
          {factions.map(f => (
            <button key={f.id} onClick={() => assignFaction(contextMenu.charName, f.id)}
              style={{ width: '100%', textAlign: 'left', padding: '5px 10px', background: 'none', border: 'none', color: ink, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2218'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Portrait upload input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && uploadingFor) await uploadPortrait(uploadingFor, file)
          e.target.value = ''
          setUploadingFor(null)
        }} />

      {/* ── Relationship list ── */}
      {relationships.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ color: dim, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Relationships</p>
          {visibleRels.map(rel => {
            const rt = relTypes.find(t => t.id === rel.type_id)
            return (
              <div key={rel.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: rel.color || '#c0c0c0', flexShrink: 0 }} />
                <span style={{ color: ink, fontSize: '0.72rem' }}>{rel.from_name}</span>
                <span style={{ color: dim, fontSize: '0.65rem' }}>→</span>
                <span style={{ color: ink, fontSize: '0.72rem' }}>{rel.to_name}</span>
                {rt && <span style={{ color: rt.color, fontSize: '0.6rem', opacity: 0.8 }}>[{rt.name}]</span>}
                {rel.label && <span style={{ color: dim, fontSize: '0.65rem', fontStyle: 'italic' }}>({rel.label})</span>}
                <button onClick={() => removeRelationship(rel.id)}
                  style={{ marginLeft: 'auto', color: '#3a3228', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#c0504a' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#3a3228' }}>
                  <X size={10} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
