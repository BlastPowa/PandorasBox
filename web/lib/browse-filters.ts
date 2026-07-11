import { MOVIE_GENRES, TV_GENRES } from "./random-shared";

export type MediaKind = "movie" | "tv";

export type SortKey = "popular" | "top_rated" | "newest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "newest", label: "Newest" },
];

export interface DiscoverFilters {
  kind: MediaKind;
  genre: string | null;
  year: number | null;
  sort: SortKey;
  provider: string | null;
  page: number;
}

export function genresFor(kind: MediaKind): string[] {
  // TV collapses Action and Adventure into one TMDB bucket (10759), so the
  // deduped key list would otherwise show two entries that filter identically.
  const map = kind === "movie" ? MOVIE_GENRES : TV_GENRES;
  const seen = new Set<number>();
  return Object.entries(map)
    .filter(([, id]) => (seen.has(id) ? false : (seen.add(id), true)))
    .map(([name]) => name);
}

export function genreId(kind: MediaKind, name: string): number | undefined {
  return (kind === "movie" ? MOVIE_GENRES : TV_GENRES)[name];
}

/** Years offered in the picker. TMDB has essentially nothing before 1950. */
export function browseYears(count = 40): number[] {
  const now = new Date().getUTCFullYear();
  return Array.from({ length: count }, (_, i) => now - i);
}

export function isSortKey(v: string): v is SortKey {
  return SORT_OPTIONS.some((s) => s.value === v);
}

/**
 * Build the TMDB `discover` query string for a filter set.
 *
 * `sort_by=vote_average.desc` on its own surfaces obscure titles with a single
 * 10/10 vote, so Top Rated pins a vote-count floor — the same guard TMDB's own
 * top-rated list uses.
 */
export function buildDiscoverQuery(f: Omit<DiscoverFilters, "page">): string {
  const params = new URLSearchParams();

  if (f.sort === "top_rated") {
    params.set("sort_by", "vote_average.desc");
    params.set("vote_count.gte", "300");
  } else if (f.sort === "newest") {
    params.set("sort_by", f.kind === "movie" ? "primary_release_date.desc" : "first_air_date.desc");
    // Without a vote floor, "newest" fills with unreleased stubs that have no
    // poster and no votes.
    params.set("vote_count.gte", "20");
  } else {
    params.set("sort_by", "popularity.desc");
    params.set("vote_count.gte", "50");
  }

  if (f.genre) {
    const ids = f.genre.split(",").map((name) => genreId(f.kind, name)).filter((id): id is number => id !== undefined);
    if (ids.length > 0) params.set("with_genres", ids.join(","));
  }

  if (f.year) {
    params.set(f.kind === "movie" ? "primary_release_year" : "first_air_date_year", String(f.year));
  }

  if (f.provider) {
    params.set("with_watch_providers", f.provider);
    params.set("watch_region", "US");
  }

  return params.toString();
}
