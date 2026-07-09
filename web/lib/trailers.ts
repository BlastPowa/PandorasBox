import "server-only";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getTrendingMovies, getTrendingSeries, getTrendingAnime } from "./discovery";

interface TMDBVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

function pickBest(videos: TMDBVideo[]): string | null {
  const yt = videos.filter((v) => v.site === "YouTube");
  if (yt.length === 0) return null;
  const rank = (v: TMDBVideo) => {
    let score = 0;
    if (v.type === "Trailer") score += 4;
    else if (v.type === "Teaser") score += 2;
    if (v.official) score += 1;
    return score;
  };
  return yt.slice().sort((a, b) => rank(b) - rank(a))[0]?.key ?? null;
}

async function tmdbTrailer(kind: "movie" | "tv", id: number, season?: number): Promise<string | null> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return null;
  const path =
    kind === "tv" && season !== undefined
      ? `tv/${id}/season/${season}/videos`
      : `${kind}/${id}/videos`;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${path}?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: TMDBVideo[] };
    return pickBest(json.results ?? []);
  } catch {
    return null;
  }
}

async function anilistTrailer(id: number): Promise<string | null> {
  const query = `query ($id: Int) { Media(id: $id) { trailer { id site } } }`;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { id } }),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { trailer?: { id: string; site: string } | null } };
    };
    const t = json.data?.Media?.trailer;
    return t && t.site === "youtube" ? t.id : null;
  } catch {
    return null;
  }
}

/** Returns a YouTube video key (not full URL) for the given title, or null. */
export async function getTrailerKey(
  type: ReelItemType,
  source: string,
  id: string,
  season?: number
): Promise<string | null> {
  if (type === "movie" && source === "tmdb") return tmdbTrailer("movie", Number.parseInt(id, 10));
  if (type === "series" && source === "tmdb")
    return tmdbTrailer("tv", Number.parseInt(id, 10), season);
  if (type === "anime" && source === "anilist") return anilistTrailer(Number.parseInt(id, 10));
  return null;
}

// ---------- Shorts feed (batch) ----------

export interface ShortItem {
  id: string;
  type: ReelItemType;
  source: string;
  refId: string;
  title: string;
  year: number | null;
  score: number | null;
  synopsis: string | null;
  posterUrl: string | null;
  trailerKey: string;
}

function refIdFor(item: UnifiedSearchResult): string | null {
  const id = item.tmdbId ?? item.anilistId;
  return id !== null && id !== undefined ? String(id) : null;
}

/**
 * Builds the vertical Shorts feed: trending titles interleaved across movies /
 * series / anime, each resolved to a YouTube trailer key. Titles without a
 * trailer are dropped so every card actually plays. Trailer lookups run in
 * parallel — one per title — and each is individually day-cached.
 */
export async function getShortsFeed(perCategory = 12): Promise<ShortItem[]> {
  const [movies, series, anime] = await Promise.all([
    getTrendingMovies(perCategory),
    getTrendingSeries(perCategory),
    getTrendingAnime(perCategory),
  ]);

  // Interleave so the feed alternates types instead of all movies first.
  const interleaved: UnifiedSearchResult[] = [];
  const max = Math.max(movies.length, series.length, anime.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) interleaved.push(movies[i]);
    if (anime[i]) interleaved.push(anime[i]);
    if (series[i]) interleaved.push(series[i]);
  }

  const resolved = await Promise.all(
    interleaved.map(async (item): Promise<ShortItem | null> => {
      const refId = refIdFor(item);
      if (!refId) return null;
      const trailerKey = await getTrailerKey(item.type, item.source, refId);
      if (!trailerKey) return null;
      return {
        id: item.id,
        type: item.type,
        source: item.source,
        refId,
        title: item.title,
        year: item.year,
        score: item.score,
        synopsis: item.synopsis,
        posterUrl: item.posterUrl,
        trailerKey,
      };
    })
  );

  return resolved.filter((x): x is ShortItem => x !== null);
}
