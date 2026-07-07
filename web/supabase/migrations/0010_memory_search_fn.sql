-- Pandora's Box — ranked full-text search over memory_search_index for the
-- "Memory Search" (vague/half-remembered title) feature. Uses Postgres
-- websearch_to_tsquery + ts_rank_cd so results come back pre-ranked by
-- relevance instead of unordered. Idempotent.

create or replace function public.memory_search(query text, max_results int default 10)
returns table (
  media_key text,
  media_type text,
  title text,
  year int,
  poster_url text,
  keywords text[],
  rank real
) language sql stable as $$
  select
    media_key,
    media_type,
    title,
    year,
    poster_url,
    keywords,
    ts_rank_cd(tsv, websearch_to_tsquery('english', query)) as rank
  from public.memory_search_index
  where tsv @@ websearch_to_tsquery('english', query)
    and is_adult = false
  order by rank desc
  limit max_results;
$$;

select 'memory_search function ready' as status;
