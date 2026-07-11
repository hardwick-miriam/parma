-- Finances module (feature 3): manual entry only, no bank APIs.

create table if not exists public.finance_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('cash', 'investment', 'pension', 'crypto', 'other')),
  balance     numeric(12,2) not null default 0,
  updated_on  date not null default current_date,
  created_at  timestamptz not null default now()
);

alter table public.finance_accounts enable row level security;

do $$ begin
  create policy "Users manage own finance accounts" on public.finance_accounts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create table if not exists public.finance_debts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  type         text not null check (type in ('loan', 'credit-card', 'other')),
  balance      numeric(12,2) not null default 0,
  apr          numeric(5,2),
  min_payment  numeric(10,2),
  updated_on   date not null default current_date,
  created_at   timestamptz not null default now()
);

alter table public.finance_debts enable row level security;

do $$ begin
  create policy "Users manage own finance debts" on public.finance_debts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- One row per day per user — snapshotted (upserted) every time any account
-- or debt balance changes, computed from the CURRENT total across all rows,
-- so net worth has a real trend over time without tracking per-account history.
create table if not exists public.finance_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_assets  numeric(12,2) not null,
  total_debts   numeric(12,2) not null,
  net_worth     numeric(12,2) not null,
  created_at    timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

alter table public.finance_snapshots enable row level security;

do $$ begin
  create policy "Users manage own finance snapshots" on public.finance_snapshots
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists finance_accounts_user on public.finance_accounts (user_id);
create index if not exists finance_debts_user on public.finance_debts (user_id);
create index if not exists finance_snapshots_user_date on public.finance_snapshots (user_id, snapshot_date);
