-- F1 (BUGS.md): a multi-food message ("porridge for breakfast, chicken wrap
-- and a monster at lunch, curry for dinner") used to collapse into a single
-- aggregate calories/protein_g total on daily_stats — no record of what was
-- actually eaten, when, or where the numbers came from. This table stores
-- one row per food item so a log entry itemises instead of blobbing.
--
-- daily_stats.calories/protein_g remain the source of truth for the
-- dashboard's daily totals (unchanged, still additive) — this table is a
-- new, additional breakdown, not a replacement.

create table if not exists public.food_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  meal         text check (meal in ('breakfast','lunch','dinner','snack')),
  description  text not null,
  calories     integer not null default 0,
  protein_g    numeric(6,1) not null default 0,
  source       text not null default 'ai-estimate' check (source in ('ai-estimate','off','manual')),
  log_entry_id uuid references public.log_entries(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.food_log enable row level security;

do $$ begin
  create policy "Users manage own food log" on public.food_log
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists food_log_user_date on public.food_log (user_id, date);
