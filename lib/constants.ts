import {
  Folder,
  BookOpen,
  Feather,
  Scroll,
  Map,
  Star,
  Moon,
  Flame,
  Cloud,
  Sword,
} from 'lucide-react'

export const FOLDER_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  folder: Folder,
  book: BookOpen,
  feather: Feather,
  scroll: Scroll,
  map: Map,
  star: Star,
  moon: Moon,
  flame: Flame,
  cloud: Cloud,
  sword: Sword,
}

export const FOLDER_COLORS = [
  { label: 'Slate', value: '#64748b' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Indigo', value: '#4338ca' },
  { label: 'Sky', value: '#0284c7' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Rose', value: '#9f1239' },
  { label: 'Silver', value: '#94a3b8' },
  { label: 'Stone', value: '#78716c' },
]
