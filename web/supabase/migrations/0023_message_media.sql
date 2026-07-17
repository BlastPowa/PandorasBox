-- Private conversation images, GIFs, and stickers.

alter table public.messages add column if not exists media_attachment jsonb;

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  (deleted_at is not null and body is null and shared_entity is null and media_attachment is null)
  or (deleted_at is null and (body is not null or shared_entity is not null or media_attachment is not null)
    and (body is null or char_length(body) between 1 and 2000)
    and (shared_entity is null or (jsonb_typeof(shared_entity) = 'object'
      and shared_entity ? 'title' and shared_entity ? 'href'
      and char_length(shared_entity->>'title') between 1 and 200
      and char_length(shared_entity->>'href') between 1 and 500
      and (shared_entity->>'href') like '/%'
      and coalesce(shared_entity->>'kind', '') in ('title', 'collection')
      and (not (shared_entity ? 'posterUrl') or shared_entity->>'posterUrl' is null or (shared_entity->>'posterUrl') like 'https://%')))
    and (media_attachment is null or (jsonb_typeof(media_attachment) = 'object'
      and coalesce(media_attachment->>'kind', '') in ('image', 'gif', 'sticker')
      and coalesce(media_attachment->>'provider', '') in ('upload', 'giphy', 'builtin')
      and char_length(coalesce(media_attachment->>'alt', '')) <= 200)))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-media', 'message-media', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "conversation members read message media" on storage.objects;
create policy "conversation members read message media" on storage.objects for select to authenticated
using (bucket_id = 'message-media' and public.can_view_conversation(((storage.foldername(name))[1])::uuid));
drop policy if exists "members upload own message media" on storage.objects;
create policy "members upload own message media" on storage.objects for insert to authenticated
with check (bucket_id = 'message-media'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_view_conversation(((storage.foldername(name))[1])::uuid));
drop policy if exists "senders delete own message media" on storage.objects;
create policy "senders delete own message media" on storage.objects for delete to authenticated
using (bucket_id = 'message-media' and (storage.foldername(name))[2] = auth.uid()::text);

create or replace function public.send_media_message(p_conversation_id uuid, p_body text, p_media jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid_type text; other_id uuid; mid uuid; clean_body text := nullif(trim(coalesce(p_body, '')), '');
declare provider text := p_media->>'provider'; media_kind text := p_media->>'kind'; storage_path text := p_media->>'storagePath'; media_url text := p_media->>'url'; sticker text := p_media->>'sticker';
begin
  if me is null then raise exception 'Authentication required'; end if;
  if clean_body is not null and char_length(clean_body) > 2000 then raise exception 'Messages are limited to 2000 characters'; end if;
  if p_media is null or jsonb_typeof(p_media) <> 'object' or media_kind not in ('image','gif','sticker') or provider not in ('upload','giphy','builtin') then raise exception 'Invalid media attachment'; end if;
  if provider = 'upload' and (storage_path is null or storage_path not like p_conversation_id::text || '/' || me::text || '/%') then raise exception 'Invalid uploaded media path'; end if;
  if provider = 'giphy' and (media_url is null or media_url !~ '^https://([a-z0-9-]+\.)?giphy\.com/') then raise exception 'Invalid GIPHY media URL'; end if;
  if provider = 'builtin' and (media_kind <> 'sticker' or sticker is null or char_length(sticker) not between 1 and 16) then raise exception 'Invalid sticker'; end if;
  select c.type, case when c.direct_user_a = me then c.direct_user_b else c.direct_user_a end into cid_type, other_id
  from public.conversations c join public.conversation_members cm on cm.conversation_id = c.id
  where c.id = p_conversation_id and c.archived_at is null and cm.user_id = me and cm.status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
  if cid_type = 'direct' and (not public.are_friends(me, other_id) or public.users_blocked(me, other_id)) then raise exception 'This conversation is read-only'; end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then raise exception 'Message rate limit reached'; end if;
  insert into public.messages (conversation_id, sender_id, body, media_attachment) values (p_conversation_id, me, clean_body, p_media) returning id into mid;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return mid;
end;
$$;

create or replace function public.delete_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.messages set body = null, shared_entity = null, media_attachment = null, deleted_at = now()
  where id = p_message_id and sender_id = auth.uid() and deleted_at is null;
  if not found then raise exception 'Message cannot be deleted'; end if;
end;
$$;

revoke all on function public.send_media_message(uuid, text, jsonb) from public;
grant execute on function public.send_media_message(uuid, text, jsonb) to authenticated;

select 'PBox private message media ready' as status;
