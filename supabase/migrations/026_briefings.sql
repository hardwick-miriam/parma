-- AI daily briefing (Main command centre "Coach") — one row per user per
-- day, generated once by the daily cron so Main never makes its own AI call.

create table if not exists public.briefings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  content    text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.briefings enable row level security;

-- Matches the existing owner-policy convention (e.g. insights table) even
-- though in practice only the service-role cron ever writes these.
do $$ begin
  create policy "Users manage own briefings" on public.briefings
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists briefings_user_date on public.briefings (user_id, date);
