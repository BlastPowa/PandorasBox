import "server-only";

export interface OmdbEpisodeRating {
  episode: number;
  title: string;
  released: string | null;
  imdbRating: number | null;
}

interface TmdbExternalIds {
  imdb_id: string | null;
}

interface TmdbTvSearchResult {
  id: number;
  name: string;
  first_air_date?: string;
}

async function tmdbFetch<T>(path: string, key: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${path}${path.includes("?") ? "&" : "?"}api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ResolvedRatingsTarget {
  imdbId: string;
  totalSeasons: number;
  matchedTitle: string;
}

/**
 * Finds an IMDb id + season count for a title so we can pull real per-episode
 * IMDb ratings from OMDb. TMDB-sourced series resolve directly via external_ids.
 * AniList-sourced anime have no IMDb link of their own, so we search TMDB's TV
 * catalog by title and use the closest match (most popular anime are also
 * listed on TMDB, which is how the "Explore" style grids can include anime).
 */
export async function resolveImdbTarget(params: {
  source: "tmdb" | "anilist";
  tmdbId: number | null;
  title: string;
}): Promise<ResolvedRatingsTarget | null> {
  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  if (!tmdbKey) return null;

  let tvId = params.source === "tmdb" ? params.tmdbId : null;
  let matchedTitle = params.title;

  if (tvId === null) {
    const search = await tmdbFetch<{ results?: TmdbTvSearchResult[] }>(
      `search/tv?query=${encodeURIComponent(params.title)}`,
      tmdbKey
    );
    const best = search?.results?.[0];
    if (!best) return null;
    tvId = best.id;
    matchedTitle = best.name;
  }

  const [external, details] = await Promise.all([
    tmdbFetch<TmdbExternalIds>(`tv/${tvId}/external_ids`, tmdbKey),
    tmdbFetch<{ number_of_seasons: number; name: string }>(`tv/${tvId}`, tmdbKey),
  ]);

  if (!external?.imdb_id) return null;

  return {
    imdbId: external.imdb_id,
    totalSeasons: details?.number_of_seasons ?? 1,
    matchedTitle: details?.name ?? matchedTitle,
  };
}

interface OmdbSeasonEpisode {
  Title: string;
  Released: string;
  Episode: string;
  imdbRating: string;
}

/** Real per-episode IMDb ratings for a season, via OMDb's official season endpoint (no scraping). */
export async function getOmdbSeasonEpisodes(imdbId: string, season: number): Promise<OmdbEpisodeRating[]> {
  const key = process.env.OMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${key}&i=${encodeURIComponent(imdbId)}&Season=${season}`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { Episodes?: OmdbSeasonEpisode[]; Response?: string };
    if (json.Response === "False" || !json.Episodes) return [];
    return json.Episodes.map((e) => ({
      episode: Number.parseInt(e.Episode, 10) || 0,
      title: e.Title,
      released: e.Released && e.Released !== "N/A" ? e.Released : null,
      imdbRating: e.imdbRating && e.imdbRating !== "N/A" ? Number.parseFloat(e.imdbRating) : null,
    })).sort((a, b) => a.episode - b.episode);
  } catch {
    return [];
  }
}
