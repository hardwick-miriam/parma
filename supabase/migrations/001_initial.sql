-- parma — initial schema migration
-- Run this in Supabase SQL Editor (select all, paste, Run) or apply via the Supabase CLI.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =========================================================
-- Profiles (1:1 with auth.users, auto-created on signup)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- Daily stats (one row per user per day)
-- =========================================================
create table public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  calories integer not null default 0,
  protein_g numeric(6,1) not null default 0,
  steps integer not null default 0,
  water_ml integer not null default 0,
  mood text,
  sleep_hours numeric(4,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, "date")
);

alter table public.daily_stats enable row level security;

create policy "Users manage own daily stats" on public.daily_stats
  for all using (auth.uid() = user_id);

-- =========================================================
-- Workout sessions (multiple per day)
-- =========================================================
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  description text not null,
  duration_minutes integer,
  feeling text,
  exercises text[],
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users manage own workouts" on public.workout_sessions
  for all using (auth.uid() = user_id);

-- =========================================================
-- Log entries (raw AI parse record)
-- =========================================================
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  raw_text text not null,
  parsed_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.log_entries enable row level security;

create policy "Users manage own log entries" on public.log_entries
  for all using (auth.uid() = user_id);

-- =========================================================
-- updated_at trigger for daily_stats
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_stats_updated_at
  before update on public.daily_stats
  for each row execute procedure public.set_updated_at();
