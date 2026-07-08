import type { UnifiedSearchResult } from "@core/utils/search";
import { mapTmdb, type TMDBTrending } from "./discovery";
import { buildDiscoverQuery, type DiscoverFilters } from "./browse-filters";

export interface DiscoverPage {
  results: UnifiedSearchResult[];
  page: number;
  totalPages: number;
}

const EMPTY: DiscoverPage = { results: [], page: 1, totalPages: 0 };

/**
 * One page of TMDB `discover` results for a filter set. Unlike the row helpers
 * in discovery.ts, this preserves `total_pages` so the grid knows whether a
 * "Load more" button should exist.
 */
export async function discoverTitles(filters: DiscoverFilters): Promise<DiscoverPage> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return EMPTY;

  const { kind, page } = filters;
  const query = buildDiscoverQuery(filters);
  // TMDB rejects page > 500 outright.
  const safePage = Math.min(Math.max(page, 1), 500);

  const url =
    `https://api.themoviedb.org/3/discover/${kind}?${query}` +
    `&api_key=${key}&include_adult=false&page=${safePage}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as { results?: TMDBTrending[]; total_pages?: number };
    const results = (json.results ?? [])
      .filter((r) => !r.adult && r.poster_path)
      .map((r) => mapTmdb(kind, r));
    return {
      results,
      page: safePage,
      totalPages: Math.min(json.total_pages ?? 1, 500),
    };
  } catch {
    return EMPTY;
  }
}
