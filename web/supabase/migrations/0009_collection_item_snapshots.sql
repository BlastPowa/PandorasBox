-- Pandora's Box — snapshot item metadata into collection_items so shared/public
-- collection pages render for ANY viewer (not just the owner). Previously the
-- collection detail resolved posters/titles from the viewer's own library, so a
-- shared link showed an empty collection to everyone else. Idempotent.
--
-- NOTE: run migration 0008 first (it adds collections.visibility, covers, the
-- integrations/friends/activity tables, etc.). This migration depends only on
-- the base collection_items table from 0001.

alter table public.collection_items add column if not exists item_type text;
alter table public.collection_items add column if not exists source text;
alter table public.collection_items add column if not exists title text;
alter table public.collection_items add column if not exists poster_url text;
alter table public.collection_items add column if not exists year int;
alter table public.collection_items add column if not exists score numeric;
alter table public.collection_items add column if not exists anilist_id int;
alter table public.collection_items add column if not exists tmdb_id int;
alter table public.collection_items add column if not exists mangadex_id text;

select 'collection_items snapshot columns ready' as status;
