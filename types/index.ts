export type Folder = {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  default_dark_mode: boolean | null
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  folder_id: string
  user_id: string
  title: string
  content: object | null
  dark_mode: boolean | null
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

export type ShareToken = {
  id: string
  document_id: string
  token: string
  created_at: string
}

export type Comment = {
  id: string
  document_id: string
  user_id: string | null
  user_email: string | null
  quoted_text: string | null
  content: string
  created_at: string
}

export type Collaborator = {
  id: string
  document_id: string
  owner_id: string
  invitee_email: string
  created_at: string
}

export type TimelineEvent = {
  id: string
  folder_id: string
  user_id: string
  title: string
  story_date: string
  description: string
  position: number
  created_at: string
}

export type CharacterRelationship = {
  id: string
  folder_id: string
  user_id: string
  from_name: string
  to_name: string
  label: string
  created_at: string
}

export type CharacterPosition = {
  folder_id: string
  user_id: string
  character_name: string
  x_pos: number
  y_pos: number
}
