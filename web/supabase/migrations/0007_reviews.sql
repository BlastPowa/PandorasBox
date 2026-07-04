-- Pandora's Box — public reviews on titles and individual episodes.
-- media_key is either a title id ("tmdb-603") for a movie/show-level review, or
-- "tmdb-603::ep5" (title id + episode number) for an episode-level review, so the
-- same table backs both the detail-page review section and the episode modal tab.
-- Reviews are PUBLIC read (so users can see how others felt) but only the author
-- can create/edit/delete their own. One review per user per media_key.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  media_key text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint check (rating between 1 and 10),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_key, user_id)
);

create index if not exists reviews_media_key_idx on public.reviews (media_key, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews readable by everyone" on public.reviews;
create policy "reviews readable by everyone"
  on public.reviews for select using (true);

drop policy if exists "users insert own review" on public.reviews;
create policy "users insert own review"
  on public.reviews for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users update own review" on public.reviews;
create policy "users update own review"
  on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own review" on public.reviews;
create policy "users delete own review"
  on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- keep updated_at current on edit
create or replace function public.touch_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_review_updated_at();

select 'reviews table ready' as status;
