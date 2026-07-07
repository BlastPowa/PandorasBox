-- Pandora's Box — feature expansion: integrations, two-way sync, friends/social,
-- collection visibility & covers, activity feed, person cache, memory-search index.
-- Idempotent: safe to run repeatedly in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- profiles: social fields + privacy
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists privacy text not null default 'public'
  check (privacy in ('public', 'friends', 'private'));

-- ---------------------------------------------------------------------------
-- integrations  (connected external accounts: MyAnimeList, AniList, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('mal', 'anilist')),
  external_user_id text,
  external_username text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  auto_sync boolean not null default true,
  last_synced_at timestamptz,
  last_sync_ok boolean,
  last_error text,
  last_failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.integrations enable row level security;
drop policy if exists "users manage own integrations" on public.integrations;
create policy "users manage own integrations"
  on public.integrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_queue  (outbound + inbound sync operations, retried with backoff)
-- ---------------------------------------------------------------------------
create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('mal', 'anilist')),
  direction text not null default 'push' check (direction in ('push', 'pull')),
  media_key text not null,                -- e.g. 'anilist-16498'
  payload jsonb not null default '{}'::jsonb, -- { status, progress, rating, ... }
  attempts int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sync_queue_pending_idx on public.sync_queue (status, created_at);
create index if not exists sync_queue_user_idx on public.sync_queue (user_id);

alter table public.sync_queue enable row level security;
drop policy if exists "users manage own sync queue" on public.sync_queue;
create policy "users manage own sync queue"
  on public.sync_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_log  (history shown in Settings → Integrations)
-- ---------------------------------------------------------------------------
create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  direction text not null,
  ok boolean not null,
  items_synced int not null default 0,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists sync_log_user_idx on public.sync_log (user_id, created_at desc);

alter table public.sync_log enable row level security;
drop policy if exists "users read own sync log" on public.sync_log;
create policy "users read own sync log"
  on public.sync_log for select using (auth.uid() = user_id);
drop policy if exists "users insert own sync log" on public.sync_log;
create policy "users insert own sync log"
  on public.sync_log for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_conflicts  (both sides changed the same entry → user picks a winner)
-- ---------------------------------------------------------------------------
create table if not exists public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  media_key text not null,
  local jsonb not null,
  remote jsonb not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, media_key)
);

alter table public.sync_conflicts enable row level security;
drop policy if exists "users manage own conflicts" on public.sync_conflicts;
create policy "users manage own conflicts"
  on public.sync_conflicts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- friendships  (requests / accepted; a blocked row hides both directions)
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee, status);
create index if not exists friendships_requester_idx on public.friendships (requester, status);

alter table public.friendships enable row level security;
drop policy if exists "participants read friendships" on public.friendships;
create policy "participants read friendships"
  on public.friendships for select using (auth.uid() in (requester, addressee));
drop policy if exists "users send requests" on public.friendships;
create policy "users send requests"
  on public.friendships for insert with check (auth.uid() = requester);
drop policy if exists "participants update friendships" on public.friendships;
create policy "participants update friendships"
  on public.friendships for update using (auth.uid() in (requester, addressee));
drop policy if exists "participants delete friendships" on public.friendships;
create policy "participants delete friendships"
  on public.friendships for delete using (auth.uid() in (requester, addressee));

-- helper: are two users friends?
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- activity  (feed events; visibility follows profile privacy)
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  verb text not null,                     -- 'started' | 'finished' | 'rated' | 'added' | 'created_collection' | ...
  media_key text,
  media_type text,
  title text,
  poster_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_idx on public.activity (user_id, created_at desc);

alter table public.activity enable row level security;
drop policy if exists "users insert own activity" on public.activity;
create policy "users insert own activity"
  on public.activity for insert with check (auth.uid() = user_id);
drop policy if exists "users delete own activity" on public.activity;
create policy "users delete own activity"
  on public.activity for delete using (auth.uid() = user_id);
drop policy if exists "activity visible per privacy" on public.activity;
create policy "activity visible per privacy"
  on public.activity for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = activity.user_id
        and (p.privacy = 'public'
             or (p.privacy = 'friends' and public.are_friends(auth.uid(), activity.user_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- collections: visibility (default PUBLIC), cover customization, share slug
-- ---------------------------------------------------------------------------
alter table public.collections add column if not exists visibility text
  check (visibility in ('public', 'friends', 'private', 'unlisted'));
update public.collections
  set visibility = case when is_public then 'public' else 'private' end
  where visibility is null;
alter table public.collections alter column visibility set default 'public';
alter table public.collections alter column visibility set not null;

alter table public.collections add column if not exists cover_mode text not null default 'collage'
  check (cover_mode in ('collage', 'upload', 'item'));
alter table public.collections add column if not exists cover_item_id text;
alter table public.collections add column if not exists cover_position text; -- e.g. '50% 30%'
alter table public.collections add column if not exists share_slug text unique;
alter table public.collections add column if not exists updated_at timestamptz not null default now();
alter table public.collections add column if not exists tags text[] not null default '{}';

-- keep updated_at fresh (used for cache invalidation on shared pages)
create or replace function public.touch_collection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.collections set updated_at = now()
  where id = coalesce(new.collection_id, old.collection_id);
  return coalesce(new, old);
end;
$$;
drop trigger if exists collection_items_touch on public.collection_items;
create trigger collection_items_touch
  after insert or update or delete on public.collection_items
  for each row execute function public.touch_collection();

-- replace old visibility policies with the 4-state model
drop policy if exists "read own or public collections" on public.collections;
create policy "read own or public collections"
  on public.collections for select using (
    auth.uid() = user_id
    or visibility in ('public', 'unlisted')
    or (visibility = 'friends' and public.are_friends(auth.uid(), user_id))
  );

drop policy if exists "read items of visible collections" on public.collection_items;
create policy "read items of visible collections"
  on public.collection_items for select using (
    exists (select 1 from public.collections c
      where c.id = collection_id
        and (c.user_id = auth.uid()
             or c.visibility in ('public', 'unlisted')
             or (c.visibility = 'friends' and public.are_friends(auth.uid(), c.user_id))))
  );

-- snapshot of items for shared pages (public read via collection visibility)
create index if not exists collection_items_item_idx on public.collection_items (item_id);

-- ---------------------------------------------------------------------------
-- collection covers storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('collection-covers', 'collection-covers', true)
on conflict (id) do nothing;

drop policy if exists "collection covers public read" on storage.objects;
create policy "collection covers public read"
  on storage.objects for select using (bucket_id = 'collection-covers');
drop policy if exists "users upload own collection covers" on storage.objects;
create policy "users upload own collection covers"
  on storage.objects for insert with check (
    bucket_id = 'collection-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "users update own collection covers" on storage.objects;
create policy "users update own collection covers"
  on storage.objects for update using (
    bucket_id = 'collection-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "users delete own collection covers" on storage.objects;
create policy "users delete own collection covers"
  on storage.objects for delete using (
    bucket_id = 'collection-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- memory_search_index  (metadata blobs for Memory Search; embedding-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.memory_search_index (
  media_key text primary key,
  media_type text not null,
  title text not null,
  alt_titles text[] not null default '{}',
  year int,
  poster_url text,
  document text not null,                 -- concatenated synopsis/genres/keywords/etc.
  keywords text[] not null default '{}',
  is_adult boolean not null default false,
  tsv tsvector generated always as (to_tsvector('english', coalesce(document, ''))) stored,
  updated_at timestamptz not null default now()
);
create index if not exists memory_search_tsv_idx on public.memory_search_index using gin (tsv);

alter table public.memory_search_index enable row level security;
drop policy if exists "memory index readable by everyone" on public.memory_search_index;
create policy "memory index readable by everyone"
  on public.memory_search_index for select using (true);
drop policy if exists "authed users write memory index" on public.memory_search_index;
create policy "authed users write memory index"
  on public.memory_search_index for insert with check (auth.uid() is not null);
drop policy if exists "authed users update memory index" on public.memory_search_index;
create policy "authed users update memory index"
  on public.memory_search_index for update using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- person_cache  (cast/crew pages)
-- ---------------------------------------------------------------------------
create table if not exists public.person_cache (
  person_key text primary key,            -- 'tmdb-123' | 'anilist-456'
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.person_cache enable row level security;
drop policy if exists "person cache readable by everyone" on public.person_cache;
create policy "person cache readable by everyone"
  on public.person_cache for select using (true);
drop policy if exists "authed users write person cache" on public.person_cache;
create policy "authed users write person cache"
  on public.person_cache for insert with check (auth.uid() is not null);
drop policy if exists "authed users update person cache" on public.person_cache;
create policy "authed users update person cache"
  on public.person_cache for update using (auth.uid() is not null);

-- Verify
select 'integrations + social + collections v2 ready' as status;
