import "server-only";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";
import { GENRE_MAP, type RandomFilters, type RandomType } from "./random-shared";

export type { RandomType, RandomFilters } from "./random-shared";
export { GENRE_MAP, GENRE_OPTIONS } from "./random-shared";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

async function tmdbRandom(kind: "movie" | "tv", genreId?: number): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const page = 1 + Math.floor(Math.random() * 12);
  const genreParam = genreId ? `&with_genres=${genreId}` : "";
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/${kind}?api_key=${key}&sort_by=popularity.desc&vote_count.gte=200&page=${page}${genreParam}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBResult[] };
    return (json.results ?? []).map((r) => {
      const date = r.release_date ?? r.first_air_date ?? "";
      return {
        id: `tmdb-${r.id}`,
        source: "tmdb" as const,
        type: kind === "movie" ? ("movie" as const) : ("series" as const),
        title: r.title ?? r.name ?? "Untitled",
        posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
        year: date ? Number.parseInt(date.slice(0, 4), 10) || null : null,
        synopsis: r.overview || null,
        score: r.vote_average > 0 ? r.vote_average : null,
        totalEpisodes: null,
        totalChapters: null,
        anilistId: null,
        tmdbId: r.id,
        mangadexId: null,
        malId: null,
      };
    });
  } catch {
    return [];
  }
}

interface AniListRandomNode {
  id: number;
  title: { english: string | null; romaji: string };
  coverImage: { large: string | null };
  seasonYear: number | null;
  averageScore: number | null;
  episodes: number | null;
  chapters: number | null;
  description: string | null;
  format: string | null;
}

async function anilistRandom(mediaType: "ANIME" | "MANGA", genre?: string): Promise<UnifiedSearchResult[]> {
  const page = 1 + Math.floor(Math.random() * 10);
  const query = `
    query ($type: MediaType, $genre: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        media(type: $type, genre: $genre, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { english romaji }
          coverImage { large }
          seasonYear
          averageScore
          episodes
          chapters
          description
          format
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { type: mediaType, genre: genre ?? null, page } }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { media?: AniListRandomNode[] } } };
    return (json.data?.Page?.media ?? []).map((m) => ({
      id: `anilist-${m.id}`,
      source: "anilist" as const,
      type: mediaType === "MANGA" ? ("manga" as const) : ("anime" as const),
      title: m.title.english ?? m.title.romaji,
      posterUrl: m.coverImage.large,
      year: m.seasonYear,
      synopsis: m.description ? m.description.replace(/<[^>]+>/g, "") : null,
      score: m.averageScore !== null ? m.averageScore / 10 : null,
      totalEpisodes: m.episodes,
      totalChapters: m.chapters,
      anilistId: m.id,
      tmdbId: null,
      mangadexId: null,
      malId: null,
    }));
  } catch {
    return [];
  }
}

export async function getRandomTitles(filters: RandomFilters): Promise<UnifiedSearchResult[]> {
  const g = filters.genre ? GENRE_MAP[filters.genre] : undefined;
  let pool: UnifiedSearchResult[] = [];

  if (filters.type === "movie") {
    pool = await tmdbRandom("movie", g?.movie);
  } else if (filters.type === "series") {
    pool = await tmdbRandom("tv", g?.tv);
  } else if (filters.type === "anime") {
    pool = await anilistRandom("ANIME", g?.anilist);
  } else if (filters.type === "manga") {
    pool = await anilistRandom("MANGA", g?.anilist);
  } else {
    const [movies, series, anime] = await Promise.all([
      tmdbRandom("movie", g?.movie),
      tmdbRandom("tv", g?.tv),
      anilistRandom("ANIME", g?.anilist),
    ]);
    pool = [...movies, ...series, ...anime];
  }

  return shuffle(pool.filter((r) => r.posterUrl)).slice(0, 18);
}
