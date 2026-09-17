import "server-only";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";
import {
  movieGenreIds,
  tvGenreIds,
  anilistGenres,
  minimumScore,
  yearRangeForEra,
  type RandomFilters,
  type GenreMode,
  type RandomEra,
  type RandomQuality,
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
  era: RandomEra,
  quality: RandomQuality,
  extra?: string
): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const voteFloor = kind === "movie" ? 150 : 40;
  const genreParam =
    genreIds.length > 0 ? `&with_genres=${genreIds.join(mode === "all" ? "," : "|")}` : "";
  const { min: minYear, max: maxYear } = yearRangeForEra(era);
  const dateField = kind === "movie" ? "primary_release_date" : "first_air_date";
  const eraParam = `${minYear ? `&${dateField}.gte=${minYear}-01-01` : ""}${maxYear ? `&${dateField}.lte=${maxYear}-12-31` : ""}`;
  const scoreFloor = minimumScore(quality);
  const scoreParam = scoreFloor ? `&vote_average.gte=${scoreFloor}` : "";
  const extraParam = extra ? `&${extra}` : "";
  const base = `https://api.themoviedb.org/3/discover/${kind}?api_key=${key}&include_adult=false&sort_by=popularity.desc&vote_count.gte=${voteFloor}${genreParam}${eraParam}${scoreParam}${extraParam}`;
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

interface AniListPagePayload {
  media?: AniListRandomNode[];
  pageInfo?: {
    lastPage?: number | null;
  } | null;
}

async function anilistRandom(
  mediaType: "ANIME" | "MANGA",
  genres: string[],
  mode: GenreMode,
  era: RandomEra,
  quality: RandomQuality
): Promise<UnifiedSearchResult[]> {
  const query = `
    query ($type: MediaType, $genres: [String], $page: Int, $startMin: FuzzyDateInt, $startMax: FuzzyDateInt, $scoreMin: Int) {
      Page(page: $page, perPage: 30) {
        pageInfo { lastPage }
        media(type: $type, genre_in: $genres, sort: POPULARITY_DESC, isAdult: false, startDate_greater: $startMin, startDate_lesser: $startMax, averageScore_greater: $scoreMin) {
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
    const { min: minYear, max: maxYear } = yearRangeForEra(era);
    const scoreFloor = minimumScore(quality);
    const variables = {
      type: mediaType,
      genres: genres.length > 0 ? genres : null,
      startMin: minYear ? minYear * 10_000 + 101 : null,
      startMax: maxYear ? maxYear * 10_000 + 1231 : null,
      scoreMin: scoreFloor ? scoreFloor * 10 - 1 : null,
    };

    async function fetchPage(page: number): Promise<AniListPagePayload | null> {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: { ...variables, page } }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: { Page?: AniListPagePayload } };
      return json.data?.Page ?? null;
    }

    // Read the first page before choosing a random page. Narrow presets can have
    // only one or two pages, so jumping straight to page 5-8 could return an
    // empty result even though matching titles exist.
    const firstPage = await fetchPage(1);
    if (!firstPage) return [];
    let pagePayload = firstPage;
    const lastPage = Math.max(1, Math.min(firstPage.pageInfo?.lastPage ?? 1, 10));
    if (lastPage > 1) {
      const randomPage = 1 + Math.floor(Math.random() * lastPage);
      if (randomPage > 1) {
        const candidate = await fetchPage(randomPage);
        if ((candidate?.media ?? []).length > 0) pagePayload = candidate ?? firstPage;
      }
    }

    const media = (pagePayload.media ?? []).filter((m) => {
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
  const era = filters.era ?? "any";
  const quality = filters.quality ?? "any";
  let pool: UnifiedSearchResult[] = [];

  if (filters.type === "movie") {
    const ids = movieGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("movie", ids, mode, era, quality);
  } else if (filters.type === "series") {
    const ids = tvGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("tv", ids, mode, era, quality);
  } else if (filters.type === "kdrama") {
    const ids = tvGenreIds(want);
    if (want.length > 0 && ids.length === 0) return [];
    pool = await tmdbRandom("tv", ids, mode, era, quality, "with_origin_country=KR&with_original_language=ko");
  } else if (filters.type === "anime") {
    const g = anilistGenres(want);
    if (want.length > 0 && g.length === 0) return [];
    pool = await anilistRandom("ANIME", g, mode, era, quality);
  } else if (filters.type === "manga") {
    const g = anilistGenres(want);
    if (want.length > 0 && g.length === 0) return [];
    pool = await anilistRandom("MANGA", g, mode, era, quality);
  } else {
    // "any" — mix sources, but only include a source if every requested genre maps onto it
    const tasks: Promise<UnifiedSearchResult[]>[] = [];
    const mIds = movieGenreIds(want);
    if (want.length === 0 || mIds.length === want.length) tasks.push(tmdbRandom("movie", mIds, mode, era, quality));
    const tIds = tvGenreIds(want);
    if (want.length === 0 || tIds.length > 0) tasks.push(tmdbRandom("tv", tIds, mode, era, quality));
    const aG = anilistGenres(want);
    if (want.length === 0 || aG.length === want.length) tasks.push(anilistRandom("ANIME", aG, mode, era, quality));
    if (want.length === 0 || aG.length === want.length) tasks.push(anilistRandom("MANGA", aG, mode, era, quality));
    const results = await Promise.all(tasks);
    pool = results.flat();
  }

  return shuffle(pool.filter((r) => r.posterUrl)).slice(0, 18);
}
