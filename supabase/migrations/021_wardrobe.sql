-- Wardrobe catalog (life vault family). Photo-first clothing tracker:
-- wardrobe_items (one row per garment) + wardrobe_wears (one row per time worn).
--
-- Storage: private 'wardrobe' bucket, path convention `${user_id}/${uuid}.${ext}`
-- (matching the existing progress-photos convention in app/api/photos/route.ts).
-- NOTE: while wiring this up, found that the existing 'progress-photos' bucket has
-- storage.objects RLS enabled but ZERO policies, and app/api/photos/route.ts calls
-- through the anon/session-scoped client — so createSignedUrl() almost certainly
-- fails for real (non-superuser) users today. Not fixed here (out of scope for this
-- migration), but NOT copied either: wardrobe gets real owner-scoped storage
-- policies below. Logged as a new item for the bug sweep.

create table if not exists public.wardrobe_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  photo_path   text,
  name         text not null,
  type         text not null check (type in (
                 'top','bottom','dress','outerwear','footwear',
                 'accessory','underwear','activewear','other'
               )),
  colours      text[] not null default '{}',
  brand        text,
  size         text,
  seasons      text[] not null default '{}',
  tags         text[] not null default '{}',
  condition    text check (condition in ('new','excellent','good','fair','worn')),
  price_paid   numeric(8,2),
  acquired_on  date,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.wardrobe_wears (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.wardrobe_items(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  worn_on    date not null,
  created_at timestamptz not null default now(),
  unique (item_id, worn_on)
);

alter table public.wardrobe_items enable row level security;
alter table public.wardrobe_wears enable row level security;

do $$ begin
  create policy "Users manage own wardrobe items" on public.wardrobe_items
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users manage own wardrobe wears" on public.wardrobe_wears
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists wardrobe_items_user on public.wardrobe_items (user_id);
create index if not exists wardrobe_items_user_type on public.wardrobe_items (user_id, type);
create index if not exists wardrobe_wears_item on public.wardrobe_wears (item_id);
create index if not exists wardrobe_wears_user_date on public.wardrobe_wears (user_id, worn_on);

-- Private storage bucket for wardrobe photos.
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

-- Owner-scoped storage policies: path convention is `${user_id}/...`, so the
-- first path segment must equal the caller's auth.uid(). Without these, RLS
-- being enabled on storage.objects with no policy blocks ALL access for the
-- anon/authenticated roles (only the service role / DB superuser bypasses RLS) —
-- exactly the gap found in the progress-photos bucket above.
do $$ begin
  create policy "Wardrobe: owner select" on storage.objects
    for select using (
      bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Wardrobe: owner insert" on storage.objects
    for insert with check (
      bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Wardrobe: owner update" on storage.objects
    for update using (
      bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Wardrobe: owner delete" on storage.objects
    for delete using (
      bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
