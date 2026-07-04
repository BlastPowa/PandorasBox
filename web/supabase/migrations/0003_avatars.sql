-- Pandora's Box — avatar uploads via Supabase Storage.
-- Public "avatars" bucket; users may only write files under a folder named
-- after their own uid (e.g. "<uid>/avatar.png"). profiles.avatar_url already exists.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
