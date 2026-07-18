-- Group owners select one appearance shared by every active group member.

alter table public.conversations
  add column if not exists chat_background_path text,
  add column if not exists chat_background_position text not null default 'center'
    check (chat_background_position in ('top', 'center', 'bottom')),
  add column if not exists chat_atmosphere text not null default 'midnight'
    check (chat_atmosphere in ('midnight', 'crimson', 'aurora', 'ocean', 'sunset', 'royal'));

-- Preserve an owner's existing personal group decoration as the initial shared appearance.
update public.conversations as conversation
set chat_background_path = member.chat_background_path,
    chat_background_position = member.chat_background_position,
    chat_atmosphere = member.chat_atmosphere
from public.conversation_members as member
where conversation.type = 'group'
  and member.conversation_id = conversation.id
  and member.user_id = conversation.owner_id
  and member.status = 'active';

drop policy if exists "members read own chat backgrounds" on storage.objects;
drop policy if exists "conversation members read chat backgrounds" on storage.objects;
create policy "conversation members read chat backgrounds" on storage.objects for select to authenticated
using (
  bucket_id = 'chat-backgrounds'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_view_conversation(((storage.foldername(name))[2])::uuid)
  )
);

create or replace function public.set_group_chat_appearance(
  p_conversation_id uuid,
  p_storage_path text,
  p_position text,
  p_atmosphere text
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Authentication required'; end if;
  if p_position not in ('top', 'center', 'bottom') then raise exception 'Invalid background position'; end if;
  if p_atmosphere not in ('midnight', 'crimson', 'aurora', 'ocean', 'sunset', 'royal') then raise exception 'Invalid chat atmosphere'; end if;
  if nullif(trim(p_storage_path), '') is not null and p_storage_path not like me::text || '/' || p_conversation_id::text || '/%' then
    raise exception 'Invalid background path';
  end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and type = 'group' and owner_id = me and archived_at is null
  ) then raise exception 'Only the group owner can change its appearance'; end if;

  update public.conversations
  set chat_background_path = nullif(trim(p_storage_path), ''),
      chat_background_position = p_position,
      chat_atmosphere = p_atmosphere,
      updated_at = now()
  where id = p_conversation_id;
end;
$$;

revoke all on function public.set_group_chat_appearance(uuid, text, text, text) from public;
grant execute on function public.set_group_chat_appearance(uuid, text, text, text) to authenticated;

select 'PBox shared group chat appearance ready' as status;
