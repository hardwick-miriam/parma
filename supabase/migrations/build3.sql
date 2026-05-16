-- ── Relationship types ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relationship_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#c0c0c0'
);
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owner only" ON relationship_types USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE character_relationships ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES relationship_types(id) ON DELETE SET NULL;

-- ── Factions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#c0c0c0'
);
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owner only" ON factions USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── worldbuilding_entries extras ─────────────────────────────────────────────
ALTER TABLE worldbuilding_entries ADD COLUMN IF NOT EXISTS portrait_url text;
ALTER TABLE worldbuilding_entries ADD COLUMN IF NOT EXISTS status text DEFAULT 'alive';
ALTER TABLE worldbuilding_entries ADD COLUMN IF NOT EXISTS faction_id uuid REFERENCES factions(id) ON DELETE SET NULL;

-- ── Folder extras ─────────────────────────────────────────────────────────────
ALTER TABLE folders ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- ── Document opens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  opened_at timestamptz DEFAULT now()
);
ALTER TABLE document_opens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owner only" ON document_opens USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── User settings extras ─────────────────────────────────────────────────────
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme text DEFAULT 'default';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#6b2737';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS editor_font text DEFAULT 'EB Garamond';

-- ── Public profiles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  banner_url text
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "public can read profiles" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "owner can edit profile" ON profiles USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── character-portraits storage bucket ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('character-portraits', 'character-portraits', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "authenticated upload portraits" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'character-portraits');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "public read portraits" ON storage.objects
    FOR SELECT USING (bucket_id = 'character-portraits');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
