import "server-only";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";
import {
  movieGenreId,
  tvGenreId,
  anilistGenre,
  type RandomFilters,
  type RandomType,
} from "./random-shared";

export type { RandomType, RandomFilters } from "./random-shared";
export { genresForType } from "./random-shared";

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

async function tmdbRandom(
  kind: "movie" | "tv",
  genreId: number | null,
  extra?: string
): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const page = 1 + Math.floor(Math.random() * 10);
  const voteFloor = kind === "movie" ? 150 : 40;
  const genreParam = genreId !== null ? `&with_genres=${genreId}` : "";
  const extraParam = extra ? `&${extra}` : "";
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/${kind}?api_key=${key}&sort_by=popularity.desc&vote_count.gte=${voteFloor}&page=${page}${genreParam}${extraParam}`,
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

async function anilistRandom(mediaType: "ANIME" | "MANGA", genre: string | null): Promise<UnifiedSearchResult[]> {
  const page = 1 + Math.floor(Math.random() * 8);
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
  const want = filters.genre && filters.genre.length > 0 ? filters.genre : null;
  let pool: UnifiedSearchResult[] = [];

  if (filters.type === "movie") {
    const id = movieGenreId(want);
    if (want && id === null) return [];
    pool = await tmdbRandom("movie", id);
  } else if (filters.type === "series") {
    const id = tvGenreId(want);
    if (want && id === null) return [];
    pool = await tmdbRandom("tv", id);
  } else if (filters.type === "kdrama") {
    const id = tvGenreId(want);
    if (want && id === null) return [];
    pool = await tmdbRandom("tv", id, "with_origin_country=KR&with_original_language=ko");
  } else if (filters.type === "anime") {
    const g = anilistGenre(want);
    if (want && g === null) return [];
    pool = await anilistRandom("ANIME", g);
  } else if (filters.type === "manga") {
    const g = anilistGenre(want);
    if (want && g === null) return [];
    pool = await anilistRandom("MANGA", g);
  } else {
    // "any" — mix sources, but only include a source if the genre maps to it
    const tasks: Promise<UnifiedSearchResult[]>[] = [];
    const mId = movieGenreId(want);
    if (!want || mId !== null) tasks.push(tmdbRandom("movie", mId));
    const tId = tvGenreId(want);
    if (!want || tId !== null) tasks.push(tmdbRandom("tv", tId));
    const aG = anilistGenre(want);
    if (!want || aG !== null) tasks.push(anilistRandom("ANIME", aG));
    const results = await Promise.all(tasks);
    pool = results.flat();
  }

  return shuffle(pool.filter((r) => r.posterUrl)).slice(0, 18);
}
