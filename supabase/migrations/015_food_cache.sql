-- OFF product cache — keyed by barcode or normalised search query
create table if not exists food_cache (
  id           uuid primary key default gen_random_uuid(),
  cache_key    text not null unique,  -- barcode OR normalised search term
  product_name text not null,
  brand        text,
  kcal_per_100g   numeric not null,
  protein_per_100g numeric not null default 0,
  carbs_per_100g   numeric not null default 0,
  fat_per_100g     numeric not null default 0,
  serving_size_g   numeric,
  barcode      text,
  confidence   text not null default 'medium' check (confidence in ('high','medium','low')),
  fetched_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '30 days')
);

create index if not exists food_cache_expires on food_cache (expires_at);
