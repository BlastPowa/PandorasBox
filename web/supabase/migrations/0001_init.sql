-- Pandora's Box — initial schema (Postgres / Supabase)
-- Per-user data isolation via Row Level Security. Run in the Supabase SQL editor.
-- Fully idempotent: safe to paste and run this whole file again at any time,
-- regardless of what already exists in your database.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  country text not null default 'IE',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- list_items  (the ReelItem shape from core/storage/schema.ts stored as jsonb)
-- ---------------------------------------------------------------------------
create table if not exists public.list_items (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item jsonb not null,
  type text not null,
  status text not null,
  rating int check (rating between 0 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists list_items_user_idx on public.list_items (user_id);
create index if not exists list_items_status_idx on public.list_items (user_id, status);

alter table public.list_items enable row level security;

drop policy if exists "users read own list" on public.list_items;
create policy "users read own list"
  on public.list_items for select using (auth.uid() = user_id);
drop policy if exists "users insert own list" on public.list_items;
create policy "users insert own list"
  on public.list_items for insert with check (auth.uid() = user_id);
drop policy if exists "users update own list" on public.list_items;
create policy "users update own list"
  on public.list_items for update using (auth.uid() = user_id);
drop policy if exists "users delete own list" on public.list_items;
create policy "users delete own list"
  on public.list_items for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- collections + collection_items  (named folders, per user)
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  item_id text not null,
  added_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "read own or public collections" on public.collections;
create policy "read own or public collections"
  on public.collections for select using (auth.uid() = user_id or is_public);
drop policy if exists "manage own collections" on public.collections;
create policy "manage own collections"
  on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read items of visible collections" on public.collection_items;
create policy "read items of visible collections"
  on public.collection_items for select using (
    exists (select 1 from public.collections c
      where c.id = collection_id and (c.user_id = auth.uid() or c.is_public))
  );
drop policy if exists "manage items of own collections" on public.collection_items;
create policy "manage items of own collections"
  on public.collection_items for all using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- watch_links  (admin-curated where-to-watch/read destinations)
-- ---------------------------------------------------------------------------
create table if not exists public.watch_links (
  id uuid primary key default gen_random_uuid(),
  media_key text not null,               -- e.g. 'tmdb-603', 'anilist-16498', or 'global'
  media_type text not null,
  site_name text not null,
  url text not null,
  category text not null check (category in ('subscription', 'free', 'rent', 'buy', 'reading')),
  quality text check (quality in ('HD', 'FHD', '4K', 'CAM', 'theatrical')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists watch_links_media_idx on public.watch_links (media_key);
alter table public.watch_links enable row level security;

drop policy if exists "watch_links readable by everyone" on public.watch_links;
create policy "watch_links readable by everyone"
  on public.watch_links for select using (true);
drop policy if exists "admins manage watch_links" on public.watch_links;
create policy "admins manage watch_links"
  on public.watch_links for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_directory  (global list of external streaming/reading sites)
-- ---------------------------------------------------------------------------
create table if not exists public.site_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  logo_url text,
  category text not null,                 -- 'movies' | 'anime' | 'manga' | 'manhwa' | 'mixed'
  is_free boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.site_directory enable row level security;
drop policy if exists "site_directory readable by everyone" on public.site_directory;
create policy "site_directory readable by everyone"
  on public.site_directory for select using (true);
drop policy if exists "admins manage site_directory" on public.site_directory;
create policy "admins manage site_directory"
  on public.site_directory for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- announcements  (admin banners on home)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  variant text not null default 'info' check (variant in ('info', 'success', 'warning')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
drop policy if exists "announcements readable by everyone" on public.announcements;
create policy "announcements readable by everyone"
  on public.announcements for select using (true);
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements"
  on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- availability  (cached live release/availability state powering badges)
-- ---------------------------------------------------------------------------
create table if not exists public.availability (
  media_key text primary key,
  status text,                            -- 'airing' | 'released' | 'theatrical' | 'digital' | 'finished'
  hd_available boolean not null default false,
  digital_date date,
  next_episode int,
  next_chapter numeric,
  next_air_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.availability enable row level security;
drop policy if exists "availability readable by everyone" on public.availability;
create policy "availability readable by everyone"
  on public.availability for select using (true);
drop policy if exists "admins manage availability" on public.availability;
create policy "admins manage availability"
  on public.availability for all using (public.is_admin()) with check (public.is_admin());

-- Verify: should return one row.
select 'profiles table + is_admin() ready' as status;
