-- PBox — independent, user-controlled public profile backgrounds.
-- Idempotent and safe to re-run.

alter table public.profiles
  add column if not exists profile_background_url text;

alter table public.profiles
  add column if not exists profile_background_position text not null default 'center';

alter table public.profiles drop constraint if exists profiles_profile_background_position_check;
alter table public.profiles add constraint profiles_profile_background_position_check
  check (profile_background_position in ('top', 'center', 'bottom'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-backgrounds',
  'profile-backgrounds',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile backgrounds public read" on storage.objects;
create policy "profile backgrounds public read"
  on storage.objects for select
  using (bucket_id = 'profile-backgrounds');

drop policy if exists "profile background owner insert" on storage.objects;
create policy "profile background owner insert"
  on storage.objects for insert
  with check (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile background owner update" on storage.objects;
create policy "profile background owner update"
  on storage.objects for update
  using (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile background owner delete" on storage.objects;
create policy "profile background owner delete"
  on storage.objects for delete
  using (bucket_id = 'profile-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
