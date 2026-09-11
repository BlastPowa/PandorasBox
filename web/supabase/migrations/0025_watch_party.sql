-- Pandora's Box watch parties: durable rooms/invites plus Supabase Realtime.

create table if not exists public.watch_party_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  media_key text not null,
  title text not null,
  media_type text not null check (media_type in ('movie', 'series', 'anime')),
  season integer,
  episode integer,
  watch_path text not null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists watch_party_rooms_host_idx on public.watch_party_rooms (host_id, status);
create index if not exists watch_party_rooms_code_idx on public.watch_party_rooms (code) where status = 'active';

create table if not exists public.watch_party_members (
  room_id uuid not null references public.watch_party_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists watch_party_members_user_idx on public.watch_party_members (user_id, joined_at desc);

create table if not exists public.watch_party_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_party_rooms (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, recipient_id),
  check (sender_id <> recipient_id)
);

create index if not exists watch_party_invites_recipient_idx on public.watch_party_invites (recipient_id, status, created_at desc);

alter table public.watch_party_rooms enable row level security;
alter table public.watch_party_members enable row level security;
alter table public.watch_party_invites enable row level security;

drop policy if exists "friends read watch party rooms" on public.watch_party_rooms;
create policy "friends read watch party rooms"
  on public.watch_party_rooms for select
  using (auth.uid() = host_id or public.are_friends(auth.uid(), host_id));

drop policy if exists "hosts create watch party rooms" on public.watch_party_rooms;
create policy "hosts create watch party rooms"
  on public.watch_party_rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "hosts update watch party rooms" on public.watch_party_rooms;
create policy "hosts update watch party rooms"
  on public.watch_party_rooms for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

drop policy if exists "hosts delete watch party rooms" on public.watch_party_rooms;
create policy "hosts delete watch party rooms"
  on public.watch_party_rooms for delete
  using (auth.uid() = host_id);

drop policy if exists "friends read watch party members" on public.watch_party_members;
create policy "friends read watch party members"
  on public.watch_party_members for select
  using (
    exists (
      select 1 from public.watch_party_rooms r
      where r.id = room_id
        and (auth.uid() = r.host_id or public.are_friends(auth.uid(), r.host_id))
    )
  );

drop policy if exists "friends join watch party rooms" on public.watch_party_members;
create policy "friends join watch party rooms"
  on public.watch_party_members for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.watch_party_rooms r
      where r.id = room_id
        and r.status = 'active'
        and (
          (auth.uid() = r.host_id and role = 'host')
          or (auth.uid() <> r.host_id and public.are_friends(auth.uid(), r.host_id) and role = 'member')
        )
    )
  );

drop policy if exists "members leave watch party rooms" on public.watch_party_members;
create policy "members leave watch party rooms"
  on public.watch_party_members for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.watch_party_rooms r where r.id = room_id and r.host_id = auth.uid())
  );

drop policy if exists "participants read watch party invites" on public.watch_party_invites;
create policy "participants read watch party invites"
  on public.watch_party_invites for select
  using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "hosts invite friends to watch parties" on public.watch_party_invites;
create policy "hosts invite friends to watch parties"
  on public.watch_party_invites for insert
  with check (
    auth.uid() = sender_id
    and public.are_friends(sender_id, recipient_id)
    and exists (
      select 1 from public.watch_party_rooms r
      where r.id = room_id and r.host_id = sender_id and r.status = 'active'
    )
  );

drop policy if exists "recipients answer watch party invites" on public.watch_party_invites;
create policy "recipients answer watch party invites"
  on public.watch_party_invites for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "hosts refresh watch party invites" on public.watch_party_invites;
create policy "hosts refresh watch party invites"
  on public.watch_party_invites for update
  using (
    auth.uid() = sender_id
    and public.are_friends(sender_id, recipient_id)
    and exists (
      select 1 from public.watch_party_rooms r
      where r.id = room_id and r.host_id = sender_id and r.status = 'active'
    )
  )
  with check (
    auth.uid() = sender_id
    and status = 'pending'
    and public.are_friends(sender_id, recipient_id)
    and exists (
      select 1 from public.watch_party_rooms r
      where r.id = room_id and r.host_id = sender_id and r.status = 'active'
    )
  );

drop policy if exists "participants delete watch party invites" on public.watch_party_invites;
create policy "participants delete watch party invites"
  on public.watch_party_invites for delete
  using (auth.uid() in (sender_id, recipient_id));

alter table public.watch_party_rooms replica identity full;
alter table public.watch_party_members replica identity full;
alter table public.watch_party_invites replica identity full;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['watch_party_rooms', 'watch_party_members', 'watch_party_invites'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
