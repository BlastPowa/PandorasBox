-- PBox Phase 5: private direct/group messaging with guarded membership,
-- read state, grouped notifications, and realtime typing signals.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text check (name is null or char_length(name) between 1 and 60),
  owner_id uuid references auth.users (id) on delete set null,
  direct_user_a uuid references auth.users (id) on delete cascade,
  direct_user_b uuid references auth.users (id) on delete cascade,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'direct' and name is null and owner_id is null and direct_user_a is not null and direct_user_b is not null and direct_user_a <> direct_user_b)
    or (type = 'group' and name is not null and owner_id is not null and direct_user_a is null and direct_user_b is null)
  )
);
create unique index if not exists conversations_direct_pair_uidx
  on public.conversations (direct_user_a, direct_user_b) where type = 'direct';
create index if not exists conversations_updated_idx on public.conversations (updated_at desc);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'left', 'removed')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  muted_at timestamptz,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  check ((status = 'active' and joined_at is not null) or status <> 'active')
);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, status, conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (deleted_at is null and body is not null and char_length(trim(body)) between 1 and 2000)
    or (deleted_at is not null and body is null)
  )
);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

create table if not exists public.conversation_typing (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  typed_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.notifications add column if not exists conversation_id uuid
  references public.conversations (id) on delete cascade;
alter table public.notifications add column if not exists message_id uuid
  references public.messages (id) on delete set null;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications drop constraint if exists notifications_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('friend_request', 'friend_accepted', 'share_received', 'group_invitation', 'message_received'));
alter table public.notifications add constraint notifications_entity_check check (
  (type in ('friend_request', 'friend_accepted') and friendship_id is not null)
  or (type = 'share_received' and share_id is not null)
  or (type in ('group_invitation', 'message_received') and conversation_id is not null)
);
create unique index if not exists notifications_conversation_event_uidx
  on public.notifications (user_id, type, conversation_id)
  where conversation_id is not null;

create or replace function public.users_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'blocked'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

create or replace function public.can_view_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_members mine on mine.conversation_id = c.id
    where c.id = p_conversation_id
      and mine.user_id = auth.uid()
      and mine.status in ('active', 'invited')
      and (
        c.type = 'group'
        or not public.users_blocked(
          auth.uid(),
          case when c.direct_user_a = auth.uid() then c.direct_user_b else c.direct_user_a end
        )
      )
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_typing enable row level security;

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations for select
  using (public.can_view_conversation(id));
drop policy if exists "members read memberships" on public.conversation_members;
create policy "members read memberships" on public.conversation_members for select
  using (public.can_view_conversation(conversation_id));
drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid() and cm.status = 'active'
      and messages.created_at >= cm.joined_at
      and not public.users_blocked(auth.uid(), messages.sender_id)
  )
);
drop policy if exists "members read typing" on public.conversation_typing;
create policy "members read typing" on public.conversation_typing for select
  using (public.can_view_conversation(conversation_id));
drop policy if exists "users set own typing" on public.conversation_typing;
create policy "users set own typing" on public.conversation_typing for insert
  with check (user_id = auth.uid() and public.can_view_conversation(conversation_id));
drop policy if exists "users update own typing" on public.conversation_typing;
create policy "users update own typing" on public.conversation_typing for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_view_conversation(conversation_id));
drop policy if exists "users clear own typing" on public.conversation_typing;
create policy "users clear own typing" on public.conversation_typing for delete
  using (user_id = auth.uid());

create or replace function public.create_direct_conversation(p_friend_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); a uuid; b uuid; cid uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if me = p_friend_id then raise exception 'You cannot message yourself'; end if;
  if not public.are_friends(me, p_friend_id) or public.users_blocked(me, p_friend_id) then
    raise exception 'Only accepted friends can start conversations';
  end if;
  if me::text < p_friend_id::text then a := me; b := p_friend_id; else a := p_friend_id; b := me; end if;
  select id into cid from public.conversations where type = 'direct' and direct_user_a = a and direct_user_b = b;
  if cid is null then
    insert into public.conversations (type, direct_user_a, direct_user_b)
    values ('direct', a, b) returning id into cid;
    insert into public.conversation_members (conversation_id, user_id, role, status, joined_at)
    values (cid, a, 'member', 'active', now()), (cid, b, 'member', 'active', now());
  else
    update public.conversation_members set status = 'active', joined_at = coalesce(joined_at, now())
    where conversation_id = cid and user_id in (me, p_friend_id);
  end if;
  return cid;
end;
$$;

create or replace function public.create_group_conversation(p_name text, p_friend_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); cid uuid; friend_id uuid; clean_ids uuid[];
begin
  if me is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 1 and 60 then raise exception 'Group names must be 1 to 60 characters'; end if;
  select coalesce(array_agg(distinct x), '{}') into clean_ids from unnest(coalesce(p_friend_ids, '{}')) x where x <> me;
  if cardinality(clean_ids) > 19 then raise exception 'Groups support up to 20 members'; end if;
  foreach friend_id in array clean_ids loop
    if not public.are_friends(me, friend_id) or public.users_blocked(me, friend_id) then
      raise exception 'Every invitee must be an accepted friend';
    end if;
  end loop;
  insert into public.conversations (type, name, owner_id) values ('group', trim(p_name), me) returning id into cid;
  insert into public.conversation_members (conversation_id, user_id, role, status, joined_at)
  values (cid, me, 'owner', 'active', now());
  foreach friend_id in array clean_ids loop
    insert into public.conversation_members (conversation_id, user_id, role, status, invited_by)
    values (cid, friend_id, 'member', 'invited', me);
    insert into public.notifications (user_id, actor_id, type, conversation_id)
    values (friend_id, me, 'group_invitation', cid)
    on conflict (user_id, type, conversation_id) where conversation_id is not null
    do update set actor_id = excluded.actor_id, read_at = null, dismissed_at = null, created_at = now();
  end loop;
  return cid;
end;
$$;

create or replace function public.respond_group_invitation(p_conversation_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare inviter uuid;
begin
  select invited_by into inviter from public.conversation_members
  where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'invited';
  if not found then raise exception 'Invitation not found'; end if;
  if p_accept and (not public.are_friends(auth.uid(), inviter) or public.users_blocked(auth.uid(), inviter)) then
    raise exception 'This invitation is no longer available';
  end if;
  update public.conversation_members
  set status = case when p_accept then 'active' else 'removed' end,
      joined_at = case when p_accept then now() else null end
  where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'invited';
  if not found then raise exception 'Invitation not found'; end if;
  update public.notifications set read_at = coalesce(read_at, now()), dismissed_at = case when p_accept then dismissed_at else coalesce(dismissed_at, now()) end
  where user_id = auth.uid() and conversation_id = p_conversation_id and type = 'group_invitation';
end;
$$;

create or replace function public.invite_group_members(p_conversation_id uuid, p_friend_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); friend_id uuid; clean_ids uuid[]; current_count int;
begin
  if not exists (select 1 from public.conversations where id = p_conversation_id and type = 'group' and owner_id = me and archived_at is null) then raise exception 'Owner access required'; end if;
  select count(*) into current_count from public.conversation_members where conversation_id = p_conversation_id and status in ('active', 'invited');
  select coalesce(array_agg(distinct x), '{}') into clean_ids from unnest(coalesce(p_friend_ids, '{}')) x where x <> me;
  if current_count + cardinality(clean_ids) > 20 then raise exception 'Groups support up to 20 members'; end if;
  foreach friend_id in array clean_ids loop
    if not public.are_friends(me, friend_id) or public.users_blocked(me, friend_id) then raise exception 'Every invitee must be an accepted friend'; end if;
    insert into public.conversation_members (conversation_id, user_id, role, status, invited_by)
    values (p_conversation_id, friend_id, 'member', 'invited', me)
    on conflict (conversation_id, user_id) do update set status = 'invited', invited_by = me, joined_at = null;
    insert into public.notifications (user_id, actor_id, type, conversation_id)
    values (friend_id, me, 'group_invitation', p_conversation_id)
    on conflict (user_id, type, conversation_id) where conversation_id is not null
    do update set actor_id = excluded.actor_id, read_at = null, dismissed_at = null, created_at = now();
  end loop;
end;
$$;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid_type text; other_id uuid; mid uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'Messages must be 1 to 2000 characters'; end if;
  select c.type, case when c.direct_user_a = me then c.direct_user_b else c.direct_user_a end
  into cid_type, other_id from public.conversations c
  join public.conversation_members cm on cm.conversation_id = c.id
  where c.id = p_conversation_id and c.archived_at is null and cm.user_id = me and cm.status = 'active';
  if not found then raise exception 'Conversation not found or unavailable'; end if;
  if cid_type = 'direct' and (not public.are_friends(me, other_id) or public.users_blocked(me, other_id)) then
    raise exception 'This conversation is read-only';
  end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Message rate limit reached';
  end if;
  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, me, trim(p_body)) returning id into mid;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return mid;
end;
$$;

create or replace function public.edit_message(p_message_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'Messages must be 1 to 2000 characters'; end if;
  update public.messages set body = trim(p_body), edited_at = now()
  where id = p_message_id and sender_id = auth.uid() and deleted_at is null and created_at > now() - interval '15 minutes';
  if not found then raise exception 'Message cannot be edited'; end if;
end;
$$;

create or replace function public.delete_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.messages set body = null, deleted_at = now()
  where id = p_message_id and sender_id = auth.uid() and deleted_at is null;
  if not found then raise exception 'Message cannot be deleted'; end if;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Conversation unavailable'; end if;
  update public.notifications set read_at = coalesce(read_at, now())
  where conversation_id = p_conversation_id and user_id = auth.uid() and type = 'message_received';
end;
$$;

create or replace function public.set_conversation_muted(p_conversation_id uuid, p_muted boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversation_members set muted_at = case when p_muted then now() else null end
  where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Conversation unavailable'; end if;
end;
$$;

create or replace function public.transfer_group_ownership(p_conversation_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation_id and type = 'group' and owner_id = auth.uid()) then raise exception 'Owner access required'; end if;
  if not exists (select 1 from public.conversation_members where conversation_id = p_conversation_id and user_id = p_new_owner and status = 'active') then raise exception 'Choose an active member'; end if;
  update public.conversation_members set role = 'member' where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.conversation_members set role = 'owner' where conversation_id = p_conversation_id and user_id = p_new_owner;
  update public.conversations set owner_id = p_new_owner, updated_at = now() where id = p_conversation_id;
end;
$$;

create or replace function public.leave_group_conversation(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.conversations where id = p_conversation_id and owner_id = auth.uid()) then raise exception 'Transfer ownership before leaving'; end if;
  update public.conversation_members set status = 'left' where conversation_id = p_conversation_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Active membership not found'; end if;
end;
$$;

create or replace function public.remove_group_member(p_conversation_id uuid, p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation_id and owner_id = auth.uid()) then raise exception 'Owner access required'; end if;
  if p_member_id = auth.uid() then raise exception 'Transfer ownership before leaving'; end if;
  update public.conversation_members set status = 'removed' where conversation_id = p_conversation_id and user_id = p_member_id and role = 'member';
  if not found then raise exception 'Member not found'; end if;
end;
$$;

create or replace function public.archive_group_conversation(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set archived_at = coalesce(archived_at, now()), updated_at = now()
  where id = p_conversation_id and type = 'group' and owner_id = auth.uid();
  if not found then raise exception 'Owner access required'; end if;
end;
$$;

create or replace function public.notify_conversation_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, conversation_id, message_id)
  select cm.user_id, new.sender_id, 'message_received', new.conversation_id, new.id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id and cm.status = 'active'
    and cm.user_id <> new.sender_id and cm.muted_at is null
    and not public.users_blocked(cm.user_id, new.sender_id)
  on conflict (user_id, type, conversation_id) where conversation_id is not null
  do update set actor_id = excluded.actor_id, message_id = excluded.message_id,
    read_at = null, dismissed_at = null, created_at = now();
  return new;
end;
$$;
drop trigger if exists message_social_notification on public.messages;
create trigger message_social_notification after insert on public.messages
  for each row execute function public.notify_conversation_message();

revoke insert, update, delete on public.conversations from anon, authenticated;
revoke insert, update, delete on public.conversation_members from anon, authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;

revoke all on function public.users_blocked(uuid, uuid) from public;
revoke all on function public.can_view_conversation(uuid) from public;
revoke all on function public.create_direct_conversation(uuid) from public;
revoke all on function public.create_group_conversation(text, uuid[]) from public;
revoke all on function public.respond_group_invitation(uuid, boolean) from public;
revoke all on function public.invite_group_members(uuid, uuid[]) from public;
revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.edit_message(uuid, text) from public;
revoke all on function public.delete_message(uuid) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.set_conversation_muted(uuid, boolean) from public;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
revoke all on function public.leave_group_conversation(uuid) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
revoke all on function public.archive_group_conversation(uuid) from public;

grant execute on function public.users_blocked(uuid, uuid) to authenticated;
grant execute on function public.can_view_conversation(uuid) to authenticated;
grant execute on function public.create_direct_conversation(uuid) to authenticated;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
grant execute on function public.respond_group_invitation(uuid, boolean) to authenticated;
grant execute on function public.invite_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.edit_message(uuid, text) to authenticated;
grant execute on function public.delete_message(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.set_conversation_muted(uuid, boolean) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_group_conversation(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.archive_group_conversation(uuid) to authenticated;

alter table public.conversations replica identity full;
alter table public.conversation_members replica identity full;
alter table public.messages replica identity full;
alter table public.conversation_typing replica identity full;
do $$
declare table_name text;
begin
  foreach table_name in array array['conversations', 'conversation_members', 'messages', 'conversation_typing'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

select 'PBox messages schema ready' as status;
