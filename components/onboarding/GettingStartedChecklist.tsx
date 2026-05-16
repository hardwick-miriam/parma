'use client'

import { useState, useEffect } from 'react'
import { Check, FolderOpen, FileText, Users, User } from 'lucide-react'

type ChecklistItem = {
  id: string
  label: string
  icon: React.ReactNode
  check: () => Promise<boolean>
}

type Props = {
  userId: string
  folderCount: number
  docCount: number
  characterCount: number
  hasProfile: boolean
}

export default function GettingStartedChecklist({ userId, folderCount, docCount, characterCount, hasProfile }: Props) {
  const dim = '#5a5048'
  const bdr = '#2a2218'
  const ink = '#d4cfc8'

  const items = [
    { id: 'folder', label: 'Create your first folio', icon: <FolderOpen size={12} />, done: folderCount > 0 },
    { id: 'doc', label: 'Write your first document', icon: <FileText size={12} />, done: docCount > 0 },
    { id: 'character', label: 'Add a character', icon: <Users size={12} />, done: characterCount > 0 },
    { id: 'profile', label: 'Set up your profile', icon: <User size={12} />, done: hasProfile },
  ]

  const completed = items.filter(i => i.done).length
  if (completed === items.length) return null

  return (
    <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '1.25rem 1.5rem', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: dim, fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Getting started
        </p>
        <p style={{ color: '#3a3228', fontSize: '0.6rem' }}>{completed}/{items.length}</p>
      </div>

      <div style={{ width: '100%', height: 2, background: '#2a2218', borderRadius: 1, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(completed / items.length) * 100}%`, background: '#6b2737', borderRadius: 1, transition: 'width 0.4s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: item.done ? '#2d1520' : 'transparent',
              border: `1px solid ${item.done ? '#6b2737' : '#2a2218'}`,
            }}>
              {item.done && <Check size={10} color="#9a6070" />}
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: item.done ? '#3a3228' : dim, fontSize: '0.72rem', textDecoration: item.done ? 'line-through' : 'none' }}>
              <span style={{ color: item.done ? '#3a3228' : '#6b2737' }}>{item.icon}</span>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
