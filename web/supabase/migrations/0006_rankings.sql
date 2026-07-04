-- Pandora's Box — personal ranking lists ("my Top Anime", "my Top Movies", etc.)
-- Separate from the 1-5 star rating: this is a user-ordered "which is better" list
-- per media type. position is a float so items can be reordered by nudging a
-- single value instead of renumbering the whole list.

create table if not exists public.user_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('movie', 'series', 'anime', 'manga', 'manhwa')),
  item_id text not null,
  title text not null,
  poster_url text,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, category, item_id)
);

alter table public.user_rankings enable row level security;

drop policy if exists "users manage own rankings" on public.user_rankings;
create policy "users manage own rankings"
  on public.user_rankings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_rankings_user_category_idx
  on public.user_rankings (user_id, category, position);
