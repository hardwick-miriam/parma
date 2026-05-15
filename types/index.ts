export type Folder = {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  folder_id: string
  user_id: string
  title: string
  content: object | null
  created_at: string
  updated_at: string
}

export type WorldbuildingSection = 'characters' | 'locations' | 'lore'

export type WorldbuildingEntry = {
  id: string
  folder_id: string
  user_id: string
  section: WorldbuildingSection
  name: string
  content: string
  created_at: string
  updated_at: string
}

export type SearchResult = {
  document_id: string
  document_title: string
  folder_id: string
  folder_name: string
  snippet: string
}
