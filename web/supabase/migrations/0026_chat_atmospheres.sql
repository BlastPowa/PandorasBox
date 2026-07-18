-- Preset atmosphere palettes for private per-member chat backgrounds.

alter table public.conversation_members
  add column if not exists chat_atmosphere text not null default 'midnight'
    check (chat_atmosphere in ('midnight', 'crimson', 'aurora', 'ocean', 'sunset', 'royal'));

create or replace function public.set_chat_background(
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
  update public.conversation_members
  set chat_background_path = nullif(trim(p_storage_path), ''),
      chat_background_position = p_position,
      chat_atmosphere = p_atmosphere
  where conversation_id = p_conversation_id and user_id = me and status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
end;
$$;

-- Keep the already-released three-argument client compatible during rollout.
create or replace function public.set_chat_background(
  p_conversation_id uuid,
  p_storage_path text,
  p_position text default 'center'
) returns void language plpgsql security definer set search_path = public as $$
declare current_atmosphere text;
begin
  select coalesce(chat_atmosphere, 'midnight') into current_atmosphere
  from public.conversation_members
  where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'active';
  perform public.set_chat_background(p_conversation_id, p_storage_path, p_position, coalesce(current_atmosphere, 'midnight'));
end;
$$;

revoke all on function public.set_chat_background(uuid, text, text, text) from public;
grant execute on function public.set_chat_background(uuid, text, text, text) to authenticated;
revoke all on function public.set_chat_background(uuid, text, text) from public;
grant execute on function public.set_chat_background(uuid, text, text) to authenticated;

select 'PBox chat atmospheres ready' as status;
