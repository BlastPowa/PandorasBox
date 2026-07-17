-- Harden client-callable message media RPCs after the 0021 feature rollout.

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  (deleted_at is not null and body is null and shared_entity is null)
  or (deleted_at is null and (body is not null or shared_entity is not null)
    and (body is null or char_length(body) between 1 and 2000)
    and (shared_entity is null or (jsonb_typeof(shared_entity) = 'object'
      and shared_entity ? 'title' and shared_entity ? 'href'
      and char_length(shared_entity->>'title') between 1 and 200
      and char_length(shared_entity->>'href') between 1 and 500
      and (shared_entity->>'href') like '/%'
      and coalesce(shared_entity->>'kind', '') in ('title', 'collection')
      and (not (shared_entity ? 'posterUrl') or shared_entity->>'posterUrl' is null or (shared_entity->>'posterUrl') like 'https://%'))))
);

create or replace function public.set_group_avatar(p_conversation_id uuid, p_avatar_url text)
returns void language plpgsql security definer set search_path = public as $$
declare clean_url text := nullif(trim(p_avatar_url), '');
begin
  if clean_url is not null and (clean_url not like 'https://%' or clean_url not like '%/storage/v1/object/public/group-avatars/%') then
    raise exception 'Invalid group picture URL';
  end if;
  update public.conversations set avatar_url = clean_url, updated_at = now()
  where id = p_conversation_id and type = 'group' and owner_id = auth.uid();
  if not found then raise exception 'Only the group owner can change its picture'; end if;
end;
$$;

select 'PBox message media security ready' as status;
