-- Message replies with server-validated same-conversation references.

alter table public.messages add column if not exists reply_to_id uuid references public.messages (id) on delete set null;
create index if not exists messages_reply_to_idx on public.messages (reply_to_id) where reply_to_id is not null;

create or replace function public.send_message_v2(
  p_conversation_id uuid,
  p_body text,
  p_shared_entity jsonb default null,
  p_media jsonb default null,
  p_reply_to_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid_type text; other_id uuid; mid uuid; member_joined_at timestamptz; clean_body text := nullif(trim(coalesce(p_body, '')), '');
declare provider text := p_media->>'provider'; media_kind text := p_media->>'kind'; storage_path text := p_media->>'storagePath'; media_url text := p_media->>'url'; sticker text := p_media->>'sticker';
begin
  if me is null then raise exception 'Authentication required'; end if;
  if clean_body is null and p_shared_entity is null and p_media is null then raise exception 'Message content required'; end if;
  if clean_body is not null and char_length(clean_body) > 2000 then raise exception 'Messages are limited to 2000 characters'; end if;
  if p_shared_entity is not null and (jsonb_typeof(p_shared_entity) <> 'object'
    or not (p_shared_entity ? 'title') or not (p_shared_entity ? 'href')
    or char_length(p_shared_entity->>'title') not between 1 and 200
    or char_length(p_shared_entity->>'href') not between 1 and 500
    or (p_shared_entity->>'href') not like '/%'
    or (p_shared_entity ? 'posterUrl' and p_shared_entity->>'posterUrl' is not null and p_shared_entity->>'posterUrl' !~ '^https://')
    or coalesce(p_shared_entity->>'kind', '') not in ('title', 'collection')) then raise exception 'Invalid shared card'; end if;
  if p_media is not null then
    if jsonb_typeof(p_media) <> 'object' or media_kind not in ('image','gif','sticker') or provider not in ('upload','giphy','builtin') then raise exception 'Invalid media attachment'; end if;
    if provider = 'upload' and (storage_path is null or storage_path not like p_conversation_id::text || '/' || me::text || '/%') then raise exception 'Invalid uploaded media path'; end if;
    if provider = 'giphy' and (media_url is null or media_url !~ '^https://([a-z0-9-]+\.)?giphy\.com/') then raise exception 'Invalid GIPHY media URL'; end if;
    if provider = 'builtin' and (media_kind <> 'sticker' or sticker is null or char_length(sticker) not between 1 and 16) then raise exception 'Invalid sticker'; end if;
  end if;
  if p_shared_entity is not null and p_media is not null then raise exception 'Send one attachment at a time'; end if;
  select c.type, case when c.direct_user_a = me then c.direct_user_b else c.direct_user_a end, cm.joined_at into cid_type, other_id, member_joined_at
  from public.conversations c join public.conversation_members cm on cm.conversation_id = c.id
  where c.id = p_conversation_id and c.archived_at is null and cm.user_id = me and cm.status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
  if cid_type = 'direct' and (not public.are_friends(me, other_id) or public.users_blocked(me, other_id)) then raise exception 'This conversation is read-only'; end if;
  if p_reply_to_id is not null and not exists (
    select 1 from public.messages target
    where target.id = p_reply_to_id
      and target.conversation_id = p_conversation_id
      and target.created_at >= member_joined_at
      and not public.users_blocked(me, target.sender_id)
  ) then raise exception 'Reply target is unavailable'; end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then raise exception 'Message rate limit reached'; end if;
  insert into public.messages (conversation_id, sender_id, body, shared_entity, media_attachment, reply_to_id)
  values (p_conversation_id, me, clean_body, p_shared_entity, p_media, p_reply_to_id) returning id into mid;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return mid;
end;
$$;

revoke all on function public.send_message_v2(uuid, text, jsonb, jsonb, uuid) from public;
grant execute on function public.send_message_v2(uuid, text, jsonb, jsonb, uuid) to authenticated;

select 'PBox message replies ready' as status;
