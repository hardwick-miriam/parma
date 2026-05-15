'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorldbuildingEntry, WorldbuildingSection } from '@/types'
import SidebarSection from './SidebarSection'

type Props = {
  folderId: string
  userId: string
  initialEntries: WorldbuildingEntry[]
  onChange: (entries: WorldbuildingEntry[]) => void
}

const SECTIONS: { key: WorldbuildingSection; label: string }[] = [
  { key: 'characters', label: 'Characters' },
  { key: 'locations', label: 'Locations' },
  { key: 'lore', label: 'Lore' },
]

export default function WorldbuildingSidebar({ folderId, userId, initialEntries, onChange }: Props) {
  const [entries, setEntries] = useState<WorldbuildingEntry[]>(initialEntries)
  const supabase = createClient()

  const update = (next: WorldbuildingEntry[]) => {
    setEntries(next)
    onChange(next)
  }

  const addEntry = async (section: WorldbuildingSection, name: string) => {
    const { data } = await supabase
      .from('worldbuilding_entries')
      .insert({ folder_id: folderId, user_id: userId, section, name, content: '' })
      .select()
      .single()
    if (data) update([...entries, data])
  }

  const updateEntry = async (id: string, changes: Partial<WorldbuildingEntry>) => {
    await supabase
      .from('worldbuilding_entries')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
    update(entries.map((e) => (e.id === id ? { ...e, ...changes } : e)))
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('worldbuilding_entries').delete().eq('id', id)
    update(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="pt-1">
        <h3 className="text-xs uppercase tracking-widest" style={{ color: '#44445a', letterSpacing: '0.12em' }}>
          Worldbuilding
        </h3>
      </div>
      {SECTIONS.map(({ key, label }) => (
        <SidebarSection
          key={key}
          section={key}
          label={label}
          entries={entries.filter((e) => e.section === key)}
          onAdd={(name) => addEntry(key, name)}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      ))}
    </div>
  )
}
