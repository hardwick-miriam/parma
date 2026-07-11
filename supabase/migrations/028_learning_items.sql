-- Reading/learning tracker (feature 20): books, courses, audiobooks, papers
-- with status + progress + rating. Separate from media_log (films/shows/
-- songs, and a simpler book log) — this is the richer, typed tracker.

create table if not exists public.learning_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  type         text not null check (type in ('book', 'course', 'audiobook', 'paper')),
  status       text not null default 'want' check (status in ('want', 'in-progress', 'finished')),
  progress_pct integer check (progress_pct is null or (progress_pct >= 0 and progress_pct <= 100)),
  rating       integer check (rating is null or (rating >= 1 and rating <= 10)),
  started_on   date,
  finished_on  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.learning_items enable row level security;

do $$ begin
  create policy "Users manage own learning items" on public.learning_items
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists learning_items_user_status on public.learning_items (user_id, status);
