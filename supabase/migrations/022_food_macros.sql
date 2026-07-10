-- Full macro tracking for the /food page: calories, protein, carbs, fat,
-- fibre, sugar, salt — daily_stats and food_log previously only had
-- calories/protein_g. Also adds macro targets to user_preferences (with
-- sensible UK NHS-reference defaults) and per-food notes memory.
--
-- All new numeric columns are NOT NULL DEFAULT 0/sensible-default — Postgres
-- (11+) applies ADD COLUMN ... DEFAULT to every existing row at add-time
-- (fast default), so there is nothing left to backfill separately: existing
-- rows read as 0 (or the stated default) rather than null immediately after
-- this migration runs, satisfying "backfill nulls" without a second pass.

alter table public.daily_stats
  add column if not exists carbs_g numeric(6,1) not null default 0,
  add column if not exists fat_g   numeric(6,1) not null default 0,
  add column if not exists fibre_g numeric(6,1) not null default 0,
  add column if not exists sugar_g numeric(6,1) not null default 0,
  add column if not exists salt_g  numeric(5,2) not null default 0;

alter table public.food_log
  add column if not exists carbs_g numeric(6,1) not null default 0,
  add column if not exists fat_g   numeric(6,1) not null default 0,
  add column if not exists fibre_g numeric(6,1) not null default 0,
  add column if not exists sugar_g numeric(6,1) not null default 0,
  add column if not exists salt_g  numeric(5,2) not null default 0;

alter table public.food_cache
  add column if not exists fibre_per_100g numeric not null default 0,
  add column if not exists sugar_per_100g numeric not null default 0,
  add column if not exists salt_per_100g  numeric not null default 0;

-- Macro targets, sensible UK/NHS-reference defaults (2000 kcal reference diet).
alter table public.user_preferences
  add column if not exists calorie_target    integer     not null default 2000,
  add column if not exists protein_target_g  numeric(6,1) not null default 150,
  add column if not exists carbs_target_g    numeric(6,1) not null default 250,
  add column if not exists fat_target_g      numeric(6,1) not null default 70,
  add column if not exists fibre_target_g    numeric(6,1) not null default 30,
  add column if not exists sugar_target_g    numeric(6,1) not null default 90,
  add column if not exists salt_target_g     numeric(5,2) not null default 6;

-- Per-food notes memory (F1 follow-on for the /food page): a note attached to
-- a food is remembered by normalised name and resurfaced whenever that food
-- is logged again, not tied to one specific log entry.
create table if not exists public.food_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  food_key   text not null,  -- normalised (lowercase, trimmed) food description
  note       text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, food_key)
);

alter table public.food_notes enable row level security;

do $$ begin
  create policy "Users manage own food notes" on public.food_notes
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists food_notes_user on public.food_notes (user_id);
