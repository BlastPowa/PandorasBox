alter table public.conversations add column if not exists avatar_url text;
alter table public.messages add column if not exists shared_entity jsonb;

alter table public.messages drop constraint if exists messages_check;
alter table public.messages add constraint messages_content_check check (
  (deleted_at is not null and body is null and shared_entity is null)
  or (deleted_at is null and (body is not null or shared_entity is not null)
    and (body is null or char_length(body) between 1 and 2000)
    and (shared_entity is null or (jsonb_typeof(shared_entity) = 'object'
      and shared_entity ? 'title' and shared_entity ? 'href'
      and char_length(shared_entity->>'title') between 1 and 200
      and char_length(shared_entity->>'href') between 1 and 500
      and (shared_entity->>'href') like '/%'
      and coalesce(shared_entity->>'kind', '') in ('title', 'collection'))))
);

create or replace function public.send_shared_message(p_conversation_id uuid, p_body text, p_shared_entity jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid_type text; other_id uuid; mid uuid; clean_body text := nullif(trim(coalesce(p_body, '')), '');
begin
  if me is null then raise exception 'Authentication required'; end if;
  if clean_body is not null and char_length(clean_body) > 2000 then raise exception 'Messages are limited to 2000 characters'; end if;
  if p_shared_entity is null or jsonb_typeof(p_shared_entity) <> 'object'
    or not (p_shared_entity ? 'title') or not (p_shared_entity ? 'href')
    or char_length(p_shared_entity->>'title') not between 1 and 200
    or char_length(p_shared_entity->>'href') not between 1 and 500
    or (p_shared_entity->>'href') not like '/%'
    or coalesce(p_shared_entity->>'kind', '') not in ('title', 'collection') then raise exception 'Invalid shared card'; end if;
  select c.type, case when c.direct_user_a = me then c.direct_user_b else c.direct_user_a end into cid_type, other_id
  from public.conversations c join public.conversation_members cm on cm.conversation_id = c.id
  where c.id = p_conversation_id and c.archived_at is null and cm.user_id = me and cm.status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
  if cid_type = 'direct' and (not public.are_friends(me, other_id) or public.users_blocked(me, other_id)) then raise exception 'This conversation is read-only'; end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then raise exception 'Message rate limit reached'; end if;
  insert into public.messages (conversation_id, sender_id, body, shared_entity) values (p_conversation_id, me, clean_body, p_shared_entity) returning id into mid;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return mid;
end;
$$;

create or replace function public.delete_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.messages set body = null, shared_entity = null, deleted_at = now()
  where id = p_message_id and sender_id = auth.uid() and deleted_at is null;
  if not found then raise exception 'Message cannot be deleted'; end if;
end;
$$;

create or replace function public.set_group_avatar(p_conversation_id uuid, p_avatar_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set avatar_url = nullif(trim(p_avatar_url), ''), updated_at = now()
  where id = p_conversation_id and type = 'group' and owner_id = auth.uid();
  if not found then raise exception 'Only the group owner can change its picture'; end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-avatars', 'group-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "group avatars public read" on storage.objects;
create policy "group avatars public read" on storage.objects for select using (bucket_id = 'group-avatars');
drop policy if exists "group avatar owner insert" on storage.objects;
create policy "group avatar owner insert" on storage.objects for insert to authenticated
with check (bucket_id = 'group-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "group avatar owner update" on storage.objects;
create policy "group avatar owner update" on storage.objects for update to authenticated
using (bucket_id = 'group-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'group-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "group avatar owner delete" on storage.objects;
create policy "group avatar owner delete" on storage.objects for delete to authenticated
using (bucket_id = 'group-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

revoke all on function public.send_shared_message(uuid, text, jsonb) from public;
revoke all on function public.set_group_avatar(uuid, text) from public;
grant execute on function public.send_shared_message(uuid, text, jsonb) to authenticated;
grant execute on function public.set_group_avatar(uuid, text) to authenticated;

select 'PBox message share cards and group avatars ready' as status;
