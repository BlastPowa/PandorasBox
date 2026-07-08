-- Pandora's Box — ranked full-text search over memory_search_index for the
-- "Memory Search" (vague/half-remembered title) feature.
--
-- v3: rank by how many DISTINCT query terms a title matches first, then by
-- ts_rank_cd as a tiebreaker.
--
-- v1 used websearch_to_tsquery, which implicitly ANDs every word in a plain
-- description — requiring every word in "the avatar wakes from a 100 year
-- sleep to save the world from fire benders" to appear in a synopsis, which
-- almost never happens. v2 OR'd the words together instead, but that exposed
-- a different bug: ts_rank_cd rewards raw term frequency, not term rarity —
-- so a synopsis that happens to repeat one common word several times (e.g.
-- "year" appearing 4 times in an unrelated anime's blurb) could outrank the
-- actual title, which matched two distinct meaningful terms ("avatar",
-- "world") just once each. v3 counts distinct matched terms per row and
-- treats that as the primary sort key — broader conceptual overlap beats
-- repetition of one generic word — with ts_rank_cd only breaking ties within
-- the same coverage level. Idempotent (safe to re-run).

create or replace function public.memory_search(query text, max_results int default 10)
returns table (
  media_key text,
  media_type text,
  title text,
  year int,
  poster_url text,
  keywords text[],
  rank real
) language plpgsql stable as $$
declare
  terms tsquery[] := array[]::tsquery[];
  combined tsquery;
  word text;
  word_query tsquery;
  i int;
begin
  for word in select unnest(regexp_split_to_array(trim(query), '\s+')) loop
    if length(word) > 2 then
      word_query := plainto_tsquery('english', word);
      if word_query is not null and numnode(word_query) > 0 then
        terms := array_append(terms, word_query);
      end if;
    end if;
  end loop;

  if array_length(terms, 1) is null then
    return;
  end if;

  combined := terms[1];
  for i in 2..array_length(terms, 1) loop
    combined := combined || terms[i];
  end loop;

  return query
    select
      m.media_key,
      m.media_type,
      m.title,
      m.year,
      m.poster_url,
      m.keywords,
      (
        (select count(*) from unnest(terms) t where m.tsv @@ t)::real * 10
        + ts_rank_cd(m.tsv, combined)
      )::real as rank
    from public.memory_search_index m
    where m.tsv @@ combined
      and m.is_adult = false
    order by rank desc
    limit max_results;
end;
$$;

select 'memory_search function v3 (coverage-ranked) ready' as status;
