-- Allow comics as a ranking category (Comics section can now be ranked
-- alongside movies/series/anime/manga/manhwa).
alter table public.user_rankings
  drop constraint if exists user_rankings_category_check;

alter table public.user_rankings
  add constraint user_rankings_category_check
  check (category in ('movie', 'series', 'anime', 'manga', 'manhwa', 'comic'));
