-- Live workout logger (Session 2): per-set logging, tied to workout_sessions
-- (reused, not replaced) and to the exercise DB by exercise_name (matches
-- the canonical name returned by lib/exerciseDb.ts:lookupExercise, same
-- convention workout_sessions.exercises already uses).

create table if not exists public.workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workout_session_id  uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name       text not null,
  weight              numeric(6,2) not null,
  reps                integer not null,
  is_warmup           boolean not null default false,
  logged_at           timestamptz not null default now()
);

alter table public.workout_sets enable row level security;

do $$ begin
  create policy "Users manage own workout sets" on public.workout_sets
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists workout_sets_user_exercise on public.workout_sets (user_id, exercise_name, logged_at desc);
create index if not exists workout_sets_session on public.workout_sets (workout_session_id);
