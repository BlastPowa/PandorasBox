-- PBox — user-controlled profile header banners.
-- Idempotent and safe to re-run.

alter table public.profiles
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-banners',
  'profile-banners',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile banners public read" on storage.objects;
create policy "profile banners public read"
  on storage.objects for select
  using (bucket_id = 'profile-banners');

drop policy if exists "profile banner owner insert" on storage.objects;
create policy "profile banner owner insert"
  on storage.objects for insert
  with check (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile banner owner update" on storage.objects;
create policy "profile banner owner update"
  on storage.objects for update
  using (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile banner owner delete" on storage.objects;
create policy "profile banner owner delete"
  on storage.objects for delete
  using (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);
