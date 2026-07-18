-- Private per-member conversation backgrounds.

alter table public.conversation_members
  add column if not exists chat_background_path text,
  add column if not exists chat_background_position text not null default 'center'
    check (chat_background_position in ('top', 'center', 'bottom'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-backgrounds', 'chat-backgrounds', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "members read own chat backgrounds" on storage.objects;
create policy "members read own chat backgrounds" on storage.objects for select to authenticated
using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members upload own chat backgrounds" on storage.objects;
create policy "members upload own chat backgrounds" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-backgrounds'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.can_view_conversation(((storage.foldername(name))[2])::uuid));

drop policy if exists "members update own chat backgrounds" on storage.objects;
create policy "members update own chat backgrounds" on storage.objects for update to authenticated
using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members delete own chat backgrounds" on storage.objects;
create policy "members delete own chat backgrounds" on storage.objects for delete to authenticated
using (bucket_id = 'chat-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.set_chat_background(
  p_conversation_id uuid,
  p_storage_path text,
  p_position text default 'center'
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Authentication required'; end if;
  if p_position not in ('top', 'center', 'bottom') then raise exception 'Invalid background position'; end if;
  if p_storage_path is not null and p_storage_path not like me::text || '/' || p_conversation_id::text || '/%' then
    raise exception 'Invalid background path';
  end if;
  update public.conversation_members
  set chat_background_path = nullif(trim(p_storage_path), ''), chat_background_position = p_position
  where conversation_id = p_conversation_id and user_id = me and status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
end;
$$;

revoke all on function public.set_chat_background(uuid, text, text) from public;
grant execute on function public.set_chat_background(uuid, text, text) to authenticated;

select 'PBox private chat backgrounds ready' as status;
