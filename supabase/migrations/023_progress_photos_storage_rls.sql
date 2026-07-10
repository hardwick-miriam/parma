-- New finding from this session (not in the original BUGS.md audit): the
-- 'progress-photos' storage bucket has storage.objects RLS enabled but had
-- ZERO policies, and app/api/photos/route.ts calls through the anon/session-
-- scoped client for upload + both createSignedUrl calls. With RLS on and no
-- permissive policy, Postgres denies access to non-superuser roles by
-- default — this likely means the Progress Photos feature has been unable
-- to actually upload or sign a URL for any real (non-service-role) request
-- since it shipped. Same fix pattern as the new 'wardrobe' bucket
-- (migration 021): owner-scoped policies keyed on the `${user_id}/...` path
-- convention already used by addProgressPhoto/uploadWardrobePhoto.

do $$ begin
  create policy "Progress photos: owner select" on storage.objects
    for select using (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Progress photos: owner insert" on storage.objects
    for insert with check (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Progress photos: owner update" on storage.objects
    for update using (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Progress photos: owner delete" on storage.objects
    for delete using (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;
