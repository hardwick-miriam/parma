-- Saved/named meals: a group of foods (with their own macros) that can be
-- re-added in one tap or via "log my usual breakfast" in the food chat bar.

create table if not exists public.saved_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  -- Array of { description, meal?, calories, protein_g, carbs_g, fat_g, fibre_g, sugar_g, salt_g }
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.saved_meals enable row level security;

do $$ begin
  create policy "Users manage own saved meals" on public.saved_meals
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists saved_meals_user on public.saved_meals (user_id);
