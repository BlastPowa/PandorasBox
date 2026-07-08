import type { ReelItemType } from "../storage/schema";
import { searchMovies, searchSeries, getPosterUrl } from "../api/tmdb";
import type { TMDBMovie, TMDBSeries } from "../api/tmdb";
import { searchAniList, formatAniListDescription } from "../api/anilist";
import type { AniListMedia } from "../api/anilist";
import { normaliseTitle } from "./formatters";

export interface UnifiedSearchResult {
  id: string;
  source: "tmdb" | "anilist" | "mangadex";
  type: ReelItemType;
  title: string;
  posterUrl: string | null;
  /** Wide 16:9 artwork (TMDB backdrop / AniList banner). The hero's full-bleed
   * background needs this — a portrait posterUrl upscales badly across a wide
   * viewport. Optional: not every source or code path supplies one. */
  backdropUrl?: string | null;
  year: number | null;
  synopsis: string | null;
  score: number | null;
  totalEpisodes: number | null;
  totalChapters: number | null;
  anilistId: number | null;
  tmdbId: number | null;
  mangadexId: string | null;
  malId: number | null;
}

export interface UnifiedSearchOptions {
  includeMovies?: boolean;
  includeSeries?: boolean;
  includeAnime?: boolean;
  includeManga?: boolean;
  includeManhwa?: boolean;
}

function parseYear(dateString: string): number | null {
  if (!dateString) {
    return null;
  }
  const year = Number.parseInt(dateString.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

function mapMovie(movie: TMDBMovie): UnifiedSearchResult {
  return {
    id: `tmdb-${movie.id}`,
    source: "tmdb",
    type: "movie",
    title: movie.title,
    posterUrl: movie.poster_path ? getPosterUrl(movie.poster_path) : null,
    year: parseYear(movie.release_date),
    synopsis: movie.overview || null,
    score: movie.vote_average > 0 ? movie.vote_average : null,
    totalEpisodes: null,
    totalChapters: null,
    anilistId: null,
    tmdbId: movie.id,
    mangadexId: null,
    malId: null,
  };
}

function mapSeries(series: TMDBSeries): UnifiedSearchResult {
  return {
    id: `tmdb-${series.id}`,
    source: "tmdb",
    type: "series",
    title: series.name,
    posterUrl: series.poster_path ? getPosterUrl(series.poster_path) : null,
    year: parseYear(series.first_air_date),
    synopsis: series.overview || null,
    score: series.vote_average > 0 ? series.vote_average : null,
    totalEpisodes: series.number_of_episodes ?? null,
    totalChapters: null,
    anilistId: null,
    tmdbId: series.id,
    mangadexId: null,
    malId: null,
  };
}

function mapAniList(media: AniListMedia): UnifiedSearchResult {
  const isManga = media.format === "MANGA" || media.format === "ONE_SHOT" || media.format === "NOVEL";
  const type: ReelItemType = isManga ? "manga" : "anime";
  return {
    id: `anilist-${media.id}`,
    source: "anilist",
    type,
    title: media.title.english ?? media.title.romaji,
    posterUrl: media.coverImage.large ?? null,
    year: media.seasonYear,
    synopsis: media.description ? formatAniListDescription(media.description) : null,
    score: media.averageScore !== null ? media.averageScore / 10 : null,
    totalEpisodes: media.episodes,
    totalChapters: media.chapters,
    anilistId: media.id,
    tmdbId: null,
    mangadexId: null,
    malId: null,
  };
}

export async function unifiedSearch(
  query: string,
  tmdbApiKey: string,
  options?: UnifiedSearchOptions
): Promise<UnifiedSearchResult[]> {
  const includeMovies = options?.includeMovies ?? true;
  const includeSeries = options?.includeSeries ?? true;
  const includeAnime = options?.includeAnime ?? true;
  const includeManga = options?.includeManga ?? true;
  const includeManhwa = options?.includeManhwa ?? true;

  const [movieResults, seriesResults, aniListResults] = await Promise.allSettled([
    includeMovies && tmdbApiKey ? searchMovies(query, tmdbApiKey) : Promise.resolve([]),
    includeSeries && tmdbApiKey ? searchSeries(query, tmdbApiKey) : Promise.resolve([]),
    includeAnime || includeManga || includeManhwa
      ? searchAniList(query)
      : Promise.resolve([]),
  ]);

  const results: UnifiedSearchResult[] = [];

  if (movieResults.status === "fulfilled") {
    results.push(...movieResults.value.map(mapMovie));
  }
  if (seriesResults.status === "fulfilled") {
    results.push(...seriesResults.value.map(mapSeries));
  }

  const tmdbTitles = new Set(results.map((r) => r.title.toLowerCase()));

  if (aniListResults.status === "fulfilled") {
    for (const media of aniListResults.value) {
      const mapped = mapAniList(media);
      if (mapped.type === "anime" && tmdbTitles.has(mapped.title.toLowerCase())) {
        continue;
      }
      results.push(mapped);
    }
  }

  const filtered = results.filter((result) => {
    switch (result.type) {
      case "movie":
        return includeMovies;
      case "series":
        return includeSeries;
      case "anime":
        return includeAnime;
      case "manga":
        return includeManga;
      case "manhwa":
        return includeManhwa;
    }
  });

  const normalisedQuery = normaliseTitle(query);
  return filtered.sort((a, b) => {
    const aExact = normaliseTitle(a.title) === normalisedQuery ? 1 : 0;
    const bExact = normaliseTitle(b.title) === normalisedQuery ? 1 : 0;
    if (aExact !== bExact) {
      return bExact - aExact;
    }
    return (b.score ?? 0) - (a.score ?? 0);
  });
}
