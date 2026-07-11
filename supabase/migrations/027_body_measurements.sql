-- Body measurements (feature 5): per-site circumference tracking, separate
-- from weight_kg on daily_stats. Stored in cm always — NLP/UI accept inches
-- too, converted at the application layer before insert.

create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  site        text not null check (site in (
    'chest','left_arm','right_arm','waist','hips',
    'left_thigh','right_thigh','left_calf','neck','shoulders'
  )),
  value_cm    numeric(5,1) not null check (value_cm > 0),
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.body_measurements enable row level security;

do $$ begin
  create policy "Users manage own body measurements" on public.body_measurements
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists body_measurements_user_site on public.body_measurements (user_id, site, measured_on desc);
