import "server-only";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import {
  getMovieDetails,
  getSeriesDetails,
  getSeasonDetails,
  getMovieWatchProviders,
  getSeriesWatchProviders,
  getPosterUrl,
  getBackdropUrl,
} from "@core/api/tmdb";
import type { TMDBEpisode, TMDBWatchProviders } from "@core/api/tmdb";
import { getAniListMedia, formatAniListDescription } from "@core/api/anilist";
import { getJikanAnimeEpisodes } from "@core/api/jikan";
import type { JikanEpisode } from "@core/api/jikan";
import { getMangaDexManga, getMangaDexChapters, getMangaDexCoverUrl } from "@core/api/mangadex";
import type { MangaDexChapter } from "@core/api/mangadex";
import { getAllWatchOptions } from "@core/api/watchProviders";
import type { WatchOption } from "@core/api/watchProviders";

export interface DetailData {
  id: string;
  type: ReelItemType;
  source: "tmdb" | "anilist" | "mangadex";
  tmdbId: number | null;
  anilistId: number | null;
  mangadexId: string | null;
  malId: number | null;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string | null;
  year: number | null;
  score: number | null;
  genres: string[];
  status: string | null;
  runtime: number | null;
  totalEpisodes: number | null;
  totalChapters: number | null;
  totalSeasons: number | null;
  studios: string[];
  episodes: TMDBEpisode[];
  chapters: { number: string; title: string | null; id: string; publishAt: string }[];
  related: UnifiedSearchResult[];
  tmdbProviders: TMDBWatchProviders | null;
  autoWatchOptions: WatchOption[];
  cast?: CastMember[];
  ratings?: Rating[];
  animeEpisodes?: JikanEpisode[];
}

export interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface Rating {
  source: string;
  value: string;
}

interface TMDBCredits {
  cast?: { name: string; character: string; profile_path: string | null; order: number }[];
}

interface TMDBAggregateCredits {
  cast?: {
    name: string;
    profile_path: string | null;
    order: number;
    roles?: { character: string }[];
  }[];
}

const MAX_CAST = 20;

async function getTmdbCast(kind: "movie" | "tv", id: number, key: string): Promise<CastMember[]> {
  try {
    if (kind === "movie") {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${key}`, {
        next: { revalidate: 60 * 60 * 24 },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as TMDBCredits;
      return (json.cast ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_CAST)
        .map((c) => ({
          name: c.name,
          character: c.character,
          profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));
    }

    // TV: aggregate_credits merges cast across every season/episode, so shows
    // with sparse per-season credit data (common for newer/foreign series) still
    // return a full main-cast list. Falls back to plain credits if that's empty.
    const aggRes = await fetch(`https://api.themoviedb.org/3/tv/${id}/aggregate_credits?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (aggRes.ok) {
      const aggJson = (await aggRes.json()) as TMDBAggregateCredits;
      const cast = (aggJson.cast ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_CAST)
        .map((c) => ({
          name: c.name,
          character: c.roles?.[0]?.character ?? "",
          profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));
      if (cast.length > 0) return cast;
    }

    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/credits?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as TMDBCredits;
    return (json.cast ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, MAX_CAST)
      .map((c) => ({
        name: c.name,
        character: c.character,
        profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      }));
  } catch {
    return [];
  }
}

/** Rotten Tomatoes / IMDb ratings via OMDb — only runs if OMDB_API_KEY is set. */
async function getOmdbRatings(title: string, year: number | null): Promise<Rating[]> {
  const key = process.env.OMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const yearParam = year ? `&y=${year}` : "";
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${key}&t=${encodeURIComponent(title)}${yearParam}`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { Ratings?: { Source: string; Value: string }[] };
    return (json.Ratings ?? []).map((r) => ({ source: r.Source, value: r.Value }));
  } catch {
    return [];
  }
}

function key(type: ReelItemType, id: string): string {
  if (type === "movie" || type === "series") return `tmdb-${id}`;
  if (type === "manga" || type === "manhwa") return `anilist-${id}`;
  return `anilist-${id}`;
}

export async function getDetail(
  type: ReelItemType,
  source: string,
  id: string,
  country: string
): Promise<DetailData | null> {
  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  try {
    if ((type === "movie" || type === "series") && source === "tmdb") {
      if (!tmdbKey) return tmdbUnavailable(type, id);
      const numId = Number.parseInt(id, 10);
      if (type === "movie") {
        const m = await getMovieDetails(numId, tmdbKey);
        let providers: TMDBWatchProviders | null = null;
        try {
          providers = await getMovieWatchProviders(numId, country, tmdbKey);
        } catch {
          providers = null;
        }
        const [cast, ratings] = await Promise.all([
          getTmdbCast("movie", numId, tmdbKey),
          getOmdbRatings(m.title, m.release_date ? Number.parseInt(m.release_date.slice(0, 4), 10) || null : null),
        ]);
        return {
          id: `tmdb-${numId}`,
          type: "movie",
          source: "tmdb",
          tmdbId: numId,
          anilistId: null,
          mangadexId: null,
          malId: null,
          title: m.title,
          posterUrl: m.poster_path ? getPosterUrl(m.poster_path) : null,
          backdropUrl: m.backdrop_path ? getBackdropUrl(m.backdrop_path) : null,
          synopsis: m.overview || null,
          year: m.release_date ? Number.parseInt(m.release_date.slice(0, 4), 10) || null : null,
          score: m.vote_average > 0 ? m.vote_average : null,
          genres: [],
          status: null,
          runtime: m.runtime,
          totalEpisodes: null,
          totalChapters: null,
          totalSeasons: null,
          studios: [],
          episodes: [],
          chapters: [],
          related: [],
          tmdbProviders: providers,
          autoWatchOptions: getAllWatchOptions({ type: "movie", title: m.title, tmdbProviders: providers }),
          cast,
          ratings,
        };
      }
      const s = await getSeriesDetails(numId, tmdbKey);
      let providers: TMDBWatchProviders | null = null;
      try {
        providers = await getSeriesWatchProviders(numId, country, tmdbKey);
      } catch {
        providers = null;
      }
      let episodes: TMDBEpisode[] = [];
      try {
        const season = await getSeasonDetails(numId, 1, tmdbKey);
        episodes = season.episodes;
      } catch {
        episodes = [];
      }
      const [seriesCast, seriesRatings] = await Promise.all([
        getTmdbCast("tv", numId, tmdbKey),
        getOmdbRatings(s.name, s.first_air_date ? Number.parseInt(s.first_air_date.slice(0, 4), 10) || null : null),
      ]);
      return {
        id: `tmdb-${numId}`,
        type: "series",
        source: "tmdb",
        tmdbId: numId,
        anilistId: null,
        mangadexId: null,
        malId: null,
        title: s.name,
        posterUrl: s.poster_path ? getPosterUrl(s.poster_path) : null,
        backdropUrl: s.backdrop_path ? getBackdropUrl(s.backdrop_path) : null,
        synopsis: s.overview || null,
        year: s.first_air_date ? Number.parseInt(s.first_air_date.slice(0, 4), 10) || null : null,
        score: s.vote_average > 0 ? s.vote_average : null,
        genres: [],
        status: s.status,
        runtime: null,
        totalEpisodes: s.number_of_episodes,
        totalChapters: null,
        totalSeasons: s.number_of_seasons,
        studios: [],
        episodes,
        chapters: [],
        related: [],
        tmdbProviders: providers,
        autoWatchOptions: getAllWatchOptions({ type: "series", title: s.name, tmdbProviders: providers }),
        cast: seriesCast,
        ratings: seriesRatings,
      };
    }

    if (type === "anime" || (source === "anilist" && (type === "manga" || type === "manhwa"))) {
      const media = await getAniListMedia(Number.parseInt(id, 10));
      const related: UnifiedSearchResult[] = media.relations.edges.slice(0, 12).map((edge) => ({
        id: `anilist-${edge.node.id}`,
        source: "anilist",
        type: edge.node.format === "MANGA" || edge.node.format === "NOVEL" ? "manga" : "anime",
        title: edge.node.title.romaji,
        posterUrl: edge.node.coverImage.large,
        year: null,
        synopsis: null,
        score: null,
        totalEpisodes: null,
        totalChapters: null,
        anilistId: edge.node.id,
        tmdbId: null,
        mangadexId: null,
        malId: null,
      }));
      const isManga = type === "manga" || type === "manhwa";

      let animeEpisodes: JikanEpisode[] = [];
      if (!isManga && media.idMal !== null) {
        try {
          animeEpisodes = await getJikanAnimeEpisodes(media.idMal, 1);
        } catch {
          animeEpisodes = [];
        }
      }

      return {
        id: `anilist-${media.id}`,
        type,
        source: "anilist",
        tmdbId: null,
        anilistId: media.id,
        mangadexId: null,
        malId: media.idMal,
        title: media.title.english ?? media.title.romaji,
        posterUrl: media.coverImage.extraLarge ?? media.coverImage.large,
        backdropUrl: media.bannerImage,
        synopsis: media.description ? formatAniListDescription(media.description) : null,
        year: media.seasonYear,
        score: media.averageScore !== null ? media.averageScore / 10 : null,
        genres: media.genres,
        status: media.status,
        runtime: null,
        totalEpisodes: media.episodes,
        totalChapters: media.chapters,
        totalSeasons: null,
        studios: media.studios.nodes.filter((n) => n.isAnimationStudio).map((n) => n.name),
        episodes: [],
        chapters: [],
        related,
        tmdbProviders: null,
        autoWatchOptions: getAllWatchOptions({ type: isManga ? "manga" : "anime", title: media.title.romaji }),
        animeEpisodes,
      };
    }

    if (source === "mangadex") {
      const manga = await getMangaDexManga(id);
      const cover = manga.relationships.find((r) => r.type === "cover_art");
      const coverUrl = cover?.attributes?.fileName ? getMangaDexCoverUrl(manga.id, cover.attributes.fileName) : null;
      let chapters: DetailData["chapters"] = [];
      try {
        const feed = await getMangaDexChapters(manga.id, "en", 0);
        chapters = feed.slice(0, 60).map((c: MangaDexChapter) => ({
          number: c.attributes.chapter ?? "?",
          title: c.attributes.title,
          id: c.id,
          publishAt: c.attributes.publishAt,
        }));
      } catch {
        chapters = [];
      }
      const title = manga.attributes.title.en ?? Object.values(manga.attributes.title)[0] ?? "Untitled";
      return {
        id: `mangadex-${manga.id}`,
        type: type === "manhwa" ? "manhwa" : "manga",
        source: "mangadex",
        tmdbId: null,
        anilistId: null,
        mangadexId: manga.id,
        malId: null,
        title,
        posterUrl: coverUrl,
        backdropUrl: null,
        synopsis: manga.attributes.description.en ?? null,
        year: manga.attributes.year,
        score: null,
        genres: manga.attributes.tags.map((t) => t.attributes.name.en).filter(Boolean).slice(0, 8),
        status: manga.attributes.status,
        runtime: null,
        totalEpisodes: null,
        totalChapters: manga.attributes.lastChapter ? Number.parseInt(manga.attributes.lastChapter, 10) || null : null,
        totalSeasons: null,
        studios: [],
        episodes: [],
        chapters,
        related: [],
        tmdbProviders: null,
        autoWatchOptions: getAllWatchOptions({ type: type === "manhwa" ? "manhwa" : "manga", title, mangaDexId: manga.id }),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function tmdbUnavailable(type: ReelItemType, id: string): DetailData {
  return {
    id: key(type, id),
    type,
    source: "tmdb",
    tmdbId: Number.parseInt(id, 10) || null,
    anilistId: null,
    mangadexId: null,
    malId: null,
    title: "TMDB API key required",
    posterUrl: null,
    backdropUrl: null,
    synopsis:
      "Add a free TMDB_API_KEY to web/.env.local to load movie and series details, cast, and where-to-watch providers.",
    year: null,
    score: null,
    genres: [],
    status: null,
    runtime: null,
    totalEpisodes: null,
    totalChapters: null,
    totalSeasons: null,
    studios: [],
    episodes: [],
    chapters: [],
    related: [],
    tmdbProviders: null,
    autoWatchOptions: [],
  };
}
