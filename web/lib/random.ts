import "server-only";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";
import {
  movieGenreIds,
  tvGenreIds,
  anilistGenres,
  type RandomFilters,
  type RandomType,
  type GenreMode,
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
  genreIds: number[],
  mode: GenreMode,
  extra?: string
): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const voteFloor = kind === "movie" ? 150 : 40;
  const genreParam =
    genreIds.length > 0 ? `&with_genres=${genreIds.join(mode === "all" ? "," : "|")}` : "";
  const extraParam = extra ? `&${extra}` : "";
  const base = `https://api.themoviedb.org/3/discover/${kind}?api_key=${key}&include_adult=false&sort_by=popularity.desc&vote_count.gte=${voteFloor}${genreParam}${extraParam}`;
  try {
    // Read page 1 first to learn how many pages this (often narrow) filter has,
    // then pick a random page within range so narrow niches (e.g. Korean action)
    // never land on an empty deep page and return nothing.
    const firstRes = await fetch(`${base}&page=1`, { cache: "no-store" });
    if (!firstRes.ok) return [];
    const firstJson = (await firstRes.json()) as { results?: TMDBResult[]; total_pages?: number };
    const totalPages = Math.min(firstJson.total_pages ?? 1, 10);
    let results = firstJson.results ?? [];
    if (totalPages > 1) {
      const page = 1 + Math.floor(Math.random() * totalPages);
      if (page > 1) {
        const r = await fetch(`${base}&page=${page}`, { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { results?: TMDBResult[] };
          if ((j.results ?? []).length > 0) results = j.results ?? results;
        }
      }
    }
    return results
      .filter((r) => !(r as TMDBResult & { adult?: boolean }).adult)
      .map((r) => {
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
  genres: string[];
  isAdult: boolean;
}

async function anilistRandom(
  mediaType: "ANIME" | "MANGA",
  genres: string[],
  mode: GenreMode
): Promise<UnifiedSearchResult[]> {
  const page = 1 + Math.floor(Math.random() * 8);
  const query = `
    query ($type: MediaType, $genres: [String], $page: Int) {
      Page(page: $page, perPage: 30) {
        media(type: $type, genre_in: $genres, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { english romaji }
          coverImage { large }
          seasonYear
          averageScore
          episodes
          chapters
          description
          format
          genres
          isAdult
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query,
        variables: { type: mediaType, genres: genres.length > 0 ? genres : null, page },
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { media?: AniListRandomNode[] } } };
    const media = (json.data?.Page?.media ?? []).filter((m) => {
      if (m.isAdult) return false;
      if (mode === "all" && genres.length > 0) {
        return genres.every((g) => m.genres.includes(g));
      }
      return true;
    });
    return media.map((m) => ({
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
  const want = filters.genres ?? [];
  const mode: GenreMode = filters.mode ?? "any";
  let pool: UnifiedSearchResult[] = [];

  if (filters.type === "movie") {
    const ids = movieGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("movie", ids, mode);
  } else if (filters.type === "series") {
    const ids = tvGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("tv", ids, mode);
  } else if (filters.type === "kdrama") {
    const ids = tvGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("tv", ids, mode, "with_origin_country=KR&with_original_language=ko");
  } else if (filters.type === "anime") {
    const g = anilistGenres(want);
    if (want.length > 0 && g.length === 0) return [];
    pool = await anilistRandom("ANIME", g, mode);
  } else if (filters.type === "manga") {
    const g = anilistGenres(want);
    if (want.length > 0 && g.length === 0) return [];
    pool = await anilistRandom("MANGA", g, mode);
  } else {
    // "any" — mix sources, but only include a source if every requested genre maps onto it
    const tasks: Promise<UnifiedSearchResult[]>[] = [];
    const mIds = movieGenreIds(want);
    if (want.length === 0 || mIds.length === want.length) tasks.push(tmdbRandom("movie", mIds, mode));
    const tIds = tvGenreIds(want);
    if (want.length === 0 || tIds.length > 0) tasks.push(tmdbRandom("tv", tIds, mode));
    const aG = anilistGenres(want);
    if (want.length === 0 || aG.length === want.length) tasks.push(anilistRandom("ANIME", aG, mode));
    const results = await Promise.all(tasks);
    pool = results.flat();
  }

  return shuffle(pool.filter((r) => r.posterUrl)).slice(0, 18);
}
