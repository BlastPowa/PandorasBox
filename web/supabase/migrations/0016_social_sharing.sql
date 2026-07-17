-- PBox social sharing: friend-to-friend title/collection shares, persistent
-- notifications, private collection grants, and safe collection copies.

create extension if not exists pgcrypto;

-- Stable, non-sequential collection URLs. Existing collection IDs remain valid.
update public.collections
set share_slug = encode(gen_random_bytes(12), 'hex')
where share_slug is null;

alter table public.collections
  alter column share_slug set default encode(gen_random_bytes(12), 'hex');
alter table public.collections
  alter column share_slug set not null;
create unique index if not exists collections_share_slug_idx
  on public.collections (share_slug);

create table if not exists public.social_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('collection', 'title')),
  collection_id uuid references public.collections (id) on delete cascade,
  media_key text,
  media_type text check (media_type is null or media_type in
    ('movie', 'series', 'anime', 'manga', 'manhwa', 'comic', 'game')),
  source text,
  title text not null,
  year int,
  poster_url text,
  href text not null check (href ~ '^/'),
  message text check (message is null or char_length(message) <= 500),
  read_at timestamptz,
  dismissed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  check (
    (entity_type = 'collection' and collection_id is not null)
    or
    (entity_type = 'title' and collection_id is null and media_key is not null
      and media_type is not null and source is not null)
  )
);

create index if not exists social_shares_recipient_idx
  on public.social_shares (recipient_id, created_at desc);
create index if not exists social_shares_sender_idx
  on public.social_shares (sender_id, created_at desc);
create index if not exists social_shares_collection_access_idx
  on public.social_shares (collection_id, recipient_id)
  where revoked_at is null;

alter table public.social_shares enable row level security;
drop policy if exists "share participants read" on public.social_shares;
create policy "share participants read"
  on public.social_shares for select
  using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "friends create shares" on public.social_shares;
create policy "friends create shares"
  on public.social_shares for insert
  with check (
    auth.uid() = sender_id
    and public.are_friends(sender_id, recipient_id)
    and (
      entity_type = 'title'
      or exists (
        select 1 from public.collections c
        where c.id = collection_id and c.user_id = sender_id
      )
    )
  );

-- No direct update/delete policies: guarded functions below own state changes.

create or replace function public.deliver_social_share(
  p_recipient_id uuid,
  p_entity_type text,
  p_collection_id uuid,
  p_media_key text,
  p_media_type text,
  p_source text,
  p_title text,
  p_year int,
  p_poster_url text,
  p_href text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sender uuid := auth.uid();
  delivered_id uuid;
begin
  if sender is null then raise exception 'Authentication required'; end if;
  if p_recipient_id = sender then raise exception 'You cannot share with yourself'; end if;
  if not public.are_friends(sender, p_recipient_id) then
    raise exception 'Only accepted friends can receive shares';
  end if;
  if p_entity_type not in ('collection', 'title') then
    raise exception 'Unsupported share type';
  end if;
  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'A title is required';
  end if;
  if p_href is null or p_href !~ '^/' then raise exception 'Invalid share route'; end if;
  if p_message is not null and char_length(p_message) > 500 then
    raise exception 'Messages are limited to 500 characters';
  end if;
  if p_entity_type = 'collection' and not exists (
    select 1 from public.collections c
    where c.id = p_collection_id and c.user_id = sender
  ) then
    raise exception 'Collection not found or access denied';
  end if;
  if p_entity_type = 'title' and (
    p_collection_id is not null or p_media_key is null
    or p_media_type not in ('movie', 'series', 'anime', 'manga', 'manhwa', 'comic', 'game')
    or p_source is null
  ) then
    raise exception 'Incomplete title share';
  end if;
  if (select count(*) from public.social_shares
      where sender_id = sender and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Share rate limit reached. Try again shortly.';
  end if;
  if exists (
    select 1 from public.social_shares s
    where s.sender_id = sender and s.recipient_id = p_recipient_id
      and s.created_at > now() - interval '60 seconds'
      and s.revoked_at is null
      and (
        (p_entity_type = 'collection' and s.collection_id = p_collection_id)
        or (p_entity_type = 'title' and s.media_key = p_media_key)
      )
  ) then
    raise exception 'This was already shared with that friend recently';
  end if;

  insert into public.social_shares (
    sender_id, recipient_id, entity_type, collection_id, media_key,
    media_type, source, title, year, poster_url, href, message
  ) values (
    sender, p_recipient_id, p_entity_type, p_collection_id, p_media_key,
    p_media_type, p_source, trim(p_title), p_year, p_poster_url, p_href,
    nullif(trim(p_message), '')
  ) returning id into delivered_id;

  return delivered_id;
end;
$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in
    ('friend_request', 'friend_accepted', 'share_received')),
  friendship_id uuid references public.friendships (id) on delete cascade,
  share_id uuid references public.social_shares (id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (type in ('friend_request', 'friend_accepted') and friendship_id is not null)
    or (type = 'share_received' and share_id is not null)
  )
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null and dismissed_at is null;
create unique index if not exists notifications_friend_event_uidx
  on public.notifications (user_id, type, friendship_id)
  where friendship_id is not null;
create unique index if not exists notifications_share_event_uidx
  on public.notifications (user_id, type, share_id)
  where share_id is not null;

alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

-- RLS helper avoids exposing another recipient's share row while allowing a
-- selected recipient to read the shared private collection.
create or replace function public.has_active_collection_share(p_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.social_shares s
    join public.collections c on c.id = s.collection_id
    where s.collection_id = p_collection_id
      and s.entity_type = 'collection'
      and s.recipient_id = auth.uid()
      and s.sender_id = c.user_id
      and s.revoked_at is null
      and public.are_friends(s.sender_id, s.recipient_id)
  );
$$;

drop policy if exists "read own or public collections" on public.collections;
create policy "read own or public collections"
  on public.collections for select using (
    auth.uid() = user_id
    or visibility in ('public', 'unlisted')
    or (visibility = 'friends' and public.are_friends(auth.uid(), user_id))
    or public.has_active_collection_share(id)
  );

drop policy if exists "read items of visible collections" on public.collection_items;
create policy "read items of visible collections"
  on public.collection_items for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (
          c.user_id = auth.uid()
          or c.visibility in ('public', 'unlisted')
          or (c.visibility = 'friends' and public.are_friends(auth.uid(), c.user_id))
          or public.has_active_collection_share(c.id)
        )
    )
  );

create or replace function public.mark_social_share_read(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_shares
  set read_at = coalesce(read_at, now())
  where id = p_share_id and recipient_id = auth.uid();
  if not found then raise exception 'Share not found or access denied'; end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where share_id = p_share_id and user_id = auth.uid();
end;
$$;

create or replace function public.dismiss_social_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_shares
  set dismissed_at = coalesce(dismissed_at, now()),
      read_at = coalesce(read_at, now())
  where id = p_share_id and recipient_id = auth.uid();
  if not found then raise exception 'Share not found or access denied'; end if;

  update public.notifications
  set dismissed_at = coalesce(dismissed_at, now()),
      read_at = coalesce(read_at, now())
  where share_id = p_share_id and user_id = auth.uid();
end;
$$;

create or replace function public.revoke_social_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_shares
  set revoked_at = coalesce(revoked_at, now())
  where id = p_share_id and sender_id = auth.uid();
  if not found then raise exception 'Share not found or access denied'; end if;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid();
  if not found then raise exception 'Notification not found or access denied'; end if;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare changed int;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null and dismissed_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.dismiss_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set dismissed_at = coalesce(dismissed_at, now()),
      read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid();
  if not found then raise exception 'Notification not found or access denied'; end if;
end;
$$;

create or replace function public.copy_visible_collection(p_collection_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  source_collection public.collections%rowtype;
  copied_id uuid;
begin
  if viewer is null then raise exception 'Authentication required'; end if;

  select * into source_collection
  from public.collections c
  where c.id = p_collection_id
    and (
      c.user_id = viewer
      or c.visibility in ('public', 'unlisted')
      or (c.visibility = 'friends' and public.are_friends(viewer, c.user_id))
      or public.has_active_collection_share(c.id)
    );
  if not found then raise exception 'Collection not found or access denied'; end if;

  insert into public.collections (
    user_id, name, description, cover_url, is_public, visibility,
    cover_mode, cover_item_id, cover_position, tags
  ) values (
    viewer, 'Copy of ' || source_collection.name, source_collection.description,
    source_collection.cover_url, false, 'private', source_collection.cover_mode,
    source_collection.cover_item_id, source_collection.cover_position,
    source_collection.tags
  ) returning id into copied_id;

  insert into public.collection_items (
    collection_id, item_id, added_at, item_type, source, title, poster_url,
    year, score, anilist_id, tmdb_id, mangadex_id
  )
  select copied_id, item_id, now(), item_type, source, title, poster_url,
    year, score, anilist_id, tmdb_id, mangadex_id
  from public.collection_items
  where collection_id = p_collection_id;

  return copied_id;
end;
$$;

-- Persistent notification creation.
create or replace function public.notify_friendship_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (new.addressee, new.requester, 'friend_request', new.id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'accepted'
    and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (new.requester, new.addressee, 'friend_accepted', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists friendship_social_notification on public.friendships;
create trigger friendship_social_notification
  after insert or update of status on public.friendships
  for each row execute function public.notify_friendship_event();

create or replace function public.notify_share_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type, share_id)
  values (new.recipient_id, new.sender_id, 'share_received', new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists share_social_notification on public.social_shares;
create trigger share_social_notification
  after insert on public.social_shares
  for each row execute function public.notify_share_received();

-- Private grants end with the friendship. Blocking also removes social history.
create or replace function public.cleanup_friendship_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if tg_op = 'DELETE' then
    a := old.requester;
    b := old.addressee;
  else
    a := new.requester;
    b := new.addressee;
  end if;

  if tg_op = 'UPDATE' and new.status = 'blocked' then
    delete from public.social_shares
    where (sender_id = a and recipient_id = b)
       or (sender_id = b and recipient_id = a);
    delete from public.notifications
    where (user_id = a and actor_id = b)
       or (user_id = b and actor_id = a);
  elsif tg_op = 'DELETE'
    or (tg_op = 'UPDATE' and old.status = 'accepted' and new.status <> 'accepted') then
    update public.social_shares
    set revoked_at = coalesce(revoked_at, now())
    where revoked_at is null
      and ((sender_id = a and recipient_id = b)
        or (sender_id = b and recipient_id = a));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists friendship_share_cleanup on public.friendships;
create trigger friendship_share_cleanup
  after update or delete on public.friendships
  for each row execute function public.cleanup_friendship_shares();

revoke all on function public.has_active_collection_share(uuid) from public;
revoke all on function public.deliver_social_share(uuid, text, uuid, text, text, text, text, int, text, text, text) from public;
revoke all on function public.mark_social_share_read(uuid) from public;
revoke all on function public.dismiss_social_share(uuid) from public;
revoke all on function public.revoke_social_share(uuid) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.dismiss_notification(uuid) from public;
revoke all on function public.copy_visible_collection(uuid) from public;

grant execute on function public.has_active_collection_share(uuid) to authenticated;
grant execute on function public.deliver_social_share(uuid, text, uuid, text, text, text, text, int, text, text, text) to authenticated;
grant execute on function public.mark_social_share_read(uuid) to authenticated;
grant execute on function public.dismiss_social_share(uuid) to authenticated;
grant execute on function public.revoke_social_share(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.dismiss_notification(uuid) to authenticated;
grant execute on function public.copy_visible_collection(uuid) to authenticated;

revoke insert, update, delete on public.social_shares from anon, authenticated;
revoke insert, update, delete on public.notifications from anon, authenticated;

alter table public.notifications replica identity full;
alter table public.social_shares replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'social_shares'
  ) then
    alter publication supabase_realtime add table public.social_shares;
  end if;
end $$;

select 'PBox social sharing schema ready' as status;
