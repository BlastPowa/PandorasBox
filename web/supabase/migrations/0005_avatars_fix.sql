-- Pandora's Box — idempotent re-run of the avatars bucket + policies.
-- Safe to run any number of times. Use this if you previously saw
-- "policy already exists" or the app shows "Bucket not found" on upload —
-- Supabase's SQL editor runs pasted scripts as one transaction, so an error on
-- any statement (like a duplicate policy) rolls back everything in that run,
-- including the bucket creation.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar owner insert" on storage.objects;
create policy "avatar owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Verify: this should return one row with public = true.
select id, name, public from storage.buckets where id = 'avatars';
