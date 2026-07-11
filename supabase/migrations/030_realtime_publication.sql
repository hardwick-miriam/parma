-- RealtimeSync only ever watched the 9 tables that existed when it was first
-- built. Every table added since (food itemisation, the live workout logger,
-- WHOOP metrics, body measurements, saved meals, learning items, Finances,
-- Mounjaro, wardrobe, insights, injury check-ins, food notes) was never added
-- to the supabase_realtime publication — postgres_changes subscriptions for
-- an unpublished table simply never fire, silently, with no error. This is
-- why logging on one page never propagated live to another.
--
-- Wrapped in DO blocks (matching this repo's existing idempotency
-- convention for policies) since ALTER PUBLICATION ... ADD TABLE errors
-- (duplicate_object) if the table is already a member.

do $$ begin alter publication supabase_realtime add table public.injury_checkins;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.food_log;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.food_notes;       exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.saved_meals;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workout_sets;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.personal_records; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.whoop_metrics;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.body_measurements;exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.learning_items;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.finance_accounts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.finance_debts;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.finance_snapshots;exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.mounjaro_doses;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.mounjaro_effects; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wardrobe_items;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wardrobe_wears;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.insights;         exception when duplicate_object then null; end $$;
