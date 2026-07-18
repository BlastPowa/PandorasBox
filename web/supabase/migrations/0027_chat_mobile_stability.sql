-- Isolate atmosphere selection from background storage-path validation.

create or replace function public.set_chat_atmosphere(
  p_conversation_id uuid,
  p_atmosphere text
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Authentication required'; end if;
  if p_atmosphere not in ('midnight', 'crimson', 'aurora', 'ocean', 'sunset', 'royal') then
    raise exception 'Invalid chat atmosphere';
  end if;

  update public.conversation_members
  set chat_atmosphere = p_atmosphere
  where conversation_id = p_conversation_id and user_id = me and status = 'active';

  if not found then raise exception 'Conversation not found or unavailable'; end if;
end;
$$;

revoke all on function public.set_chat_atmosphere(uuid, text) from public;
grant execute on function public.set_chat_atmosphere(uuid, text) to authenticated;

select 'PBox chat mobile stability ready' as status;
