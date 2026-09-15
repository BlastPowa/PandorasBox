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
import { getJikanAnime, getJikanAnimeEpisodes, searchJikanAnime } from "@core/api/jikan";
import type { JikanAnime, JikanEpisode } from "@core/api/jikan";
import { getMangaDexManga, getMangaDexChapters, getMangaDexCoverUrl } from "@core/api/mangadex";
import type { MangaDexChapter } from "@core/api/mangadex";
import { getAllWatchOptions } from "@core/api/watchProviders";
import type { WatchOption } from "@core/api/watchProviders";
import { indexTitle } from "@/lib/memory-search/index-writer";

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
  about?: DetailAbout;
  galleryImages?: DetailGalleryImage[];
}

export interface DetailAbout {
  releaseDate?: string | null;
  lastAirDate?: string | null;
  certification?: string | null;
  originalTitle?: string | null;
  status?: string | null;
  seriesType?: string | null;
  creators?: string[];
  directors?: string[];
  writers?: string[];
  productionCompanies?: string[];
  networks?: string[];
  countries?: string[];
  originalLanguage?: string | null;
  budget?: number | null;
  revenue?: number | null;
  collection?: string | null;
  collectionId?: number | null;
}

export interface DetailGalleryImage {
  url: string;
  width: number;
  height: number;
}

export interface CastMember {
  id: number | null;
  source: "tmdb" | "anilist";
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface Rating {
  source: string;
  value: string;
}

interface TMDBCredits {
  cast?: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
}

interface TMDBAggregateCredits {
  cast?: {
    id: number;
    name: string;
    profile_path: string | null;
    order: number;
    roles?: { character: string }[];
  }[];
}

const MAX_CAST = 20;

function uniqueNames(values: (string | null | undefined)[], limit = 8): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit);
}

function movieCertification(
  results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[] | undefined,
  country: string
): string | null {
  const preferredCountries = [country.toUpperCase(), "US"];
  for (const code of preferredCountries) {
    const releases = results?.find((entry) => entry.iso_3166_1 === code)?.release_dates ?? [];
    const rated = releases.filter((entry) => entry.certification.trim());
    const preferred = rated.find((entry) => entry.type === 3) ?? rated[0];
    if (preferred) return preferred.certification;
  }
  return null;
}

function seriesCertification(
  results: { iso_3166_1: string; rating: string }[] | undefined,
  country: string
): string | null {
  const preferredCountries = [country.toUpperCase(), "US"];
  for (const code of preferredCountries) {
    const rating = results?.find((entry) => entry.iso_3166_1 === code && entry.rating.trim())?.rating;
    if (rating) return rating;
  }
  return null;
}

function galleryImages(
  images: { backdrops?: { file_path: string; width: number; height: number; vote_average: number; vote_count?: number; iso_639_1?: string | null }[] } | undefined
): DetailGalleryImage[] {
  const seen = new Set<string>();
  const unique = (images?.backdrops ?? [])
    .filter((image) => image.file_path && image.width > image.height)
    .filter((image) => {
      const key = image.file_path.trim().toLowerCase().replace(/^\/+/, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aCleanArtwork = a.iso_639_1 == null ? 1 : 0;
      const bCleanArtwork = b.iso_639_1 == null ? 1 : 0;
      if (aCleanArtwork !== bCleanArtwork) return bCleanArtwork - aCleanArtwork;
      const voteDelta = (b.vote_average ?? 0) - (a.vote_average ?? 0);
      if (Math.abs(voteDelta) > 0.25) return voteDelta;
      return (b.vote_count ?? 0) - (a.vote_count ?? 0);
    });

  // Keep the strongest artwork while avoiding a rail full of near-identical
  // image dimensions/scores from the same upload batch.
  const selected: typeof unique = [];
  const visualBuckets = new Map<string, number>();
  for (const image of unique) {
    const ratio = image.width / image.height;
    const ratioBucket = (Math.round(ratio * 20) / 20).toFixed(2);
    const scoreBucket = (Math.round((image.vote_average ?? 0) * 2) / 2).toFixed(1);
    const bucket = `${ratioBucket}:${scoreBucket}:${image.iso_639_1 ?? "clean"}`;
    const count = visualBuckets.get(bucket) ?? 0;
    if (count >= 3 && selected.length >= 8) continue;
    visualBuckets.set(bucket, count + 1);
    selected.push(image);
    if (selected.length >= 14) break;
  }

  return selected.map((image) => ({
    url: getBackdropUrl(image.file_path),
    width: image.width,
    height: image.height,
  }));
}

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
          id: c.id,
          source: "tmdb" as const,
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
          id: c.id,
          source: "tmdb" as const,
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
        id: c.id,
        source: "tmdb" as const,
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

function normaliseLookupTitle(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function jikanAnimeYear(anime: JikanAnime): number | null {
  const value = anime.aired.from?.slice(0, 4) ?? "";
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : null;
}

function jikanTitleMatches(anime: JikanAnime, title: string): boolean {
  const wanted = normaliseLookupTitle(title);
  if (!wanted) return false;
  const candidates = [anime.title, anime.title_english ?? "", ...(anime.titles ?? []).map((entry) => entry.title)];
  return candidates.some((candidate) => normaliseLookupTitle(candidate) === wanted);
}

function getAnimeMetadataFallback(anilistId: number, title: string, year?: number | null): DetailData {
  return {
    id: `anilist-${anilistId}`,
    type: "anime",
    source: "anilist",
    tmdbId: null,
    anilistId,
    mangadexId: null,
    malId: null,
    title,
    posterUrl: null,
    backdropUrl: null,
    synopsis: null,
    year: year ?? null,
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
    autoWatchOptions: getAllWatchOptions({ type: "anime", title }),
    animeEpisodes: [],
  };
}

async function getJikanAnimeFallback(
  anilistId: number,
  title: string,
  expectedYear?: number | null
): Promise<DetailData | null> {
  let candidates: JikanAnime[];
  try {
    candidates = await searchJikanAnime(title);
  } catch {
    return getAnimeMetadataFallback(anilistId, title, expectedYear);
  }
  const titleMatches = candidates.filter((anime) => jikanTitleMatches(anime, title));
  const anime = expectedYear
    ? titleMatches.find((candidate) => jikanAnimeYear(candidate) === expectedYear) ?? null
    : titleMatches[0] ?? null;
  if (!anime) return getAnimeMetadataFallback(anilistId, title, expectedYear);

  let animeEpisodes: JikanEpisode[] = [];
  try {
    animeEpisodes = await getJikanAnimeEpisodes(anime.mal_id, 1);
  } catch {
    animeEpisodes = [];
  }

  const resolvedTitle = anime.title_english?.trim() || title;
  const originalTitle = anime.title.trim() && normaliseLookupTitle(anime.title) !== normaliseLookupTitle(resolvedTitle)
    ? anime.title.trim()
    : null;
  const year = jikanAnimeYear(anime) ?? expectedYear ?? null;

  return {
    id: `anilist-${anilistId}`,
    type: "anime",
    source: "anilist",
    tmdbId: null,
    anilistId,
    mangadexId: null,
    malId: anime.mal_id,
    title: resolvedTitle,
    posterUrl: anime.images.jpg.large_image_url || anime.images.jpg.image_url || null,
    backdropUrl: null,
    synopsis: anime.synopsis,
    year,
    score: anime.score,
    genres: anime.genres.map((genre) => genre.name),
    status: anime.status,
    runtime: null,
    totalEpisodes: anime.episodes,
    totalChapters: null,
    totalSeasons: null,
    studios: [],
    episodes: [],
    chapters: [],
    related: [],
    tmdbProviders: null,
    autoWatchOptions: getAllWatchOptions({ type: "anime", title: resolvedTitle }),
    animeEpisodes,
    about: {
      releaseDate: anime.aired.from,
      originalTitle,
      status: anime.status,
    },
  };
}

async function getJikanAnimeDetail(malId: number): Promise<DetailData | null> {
  if (!Number.isFinite(malId) || malId <= 0) return null;

  let anime: JikanAnime;
  try {
    anime = await getJikanAnime(malId);
  } catch {
    return null;
  }

  let animeEpisodes: JikanEpisode[] = [];
  try {
    animeEpisodes = await getJikanAnimeEpisodes(malId, 1);
  } catch {
    animeEpisodes = [];
  }

  const resolvedTitle = anime.title_english?.trim() || anime.title;
  const originalTitle = anime.title.trim() && normaliseLookupTitle(anime.title) !== normaliseLookupTitle(resolvedTitle)
    ? anime.title.trim()
    : null;
  const year = jikanAnimeYear(anime);
  const genres = anime.genres.map((genre) => genre.name);
  const posterUrl = anime.images.jpg.large_image_url || anime.images.jpg.image_url || null;

  indexTitle({
    mediaKey: `jikan-${malId}`,
    mediaType: "anime",
    title: resolvedTitle,
    altTitles: originalTitle ? [originalTitle] : [],
    year,
    posterUrl,
    synopsis: anime.synopsis,
    genres,
  });

  return {
    id: `jikan-${malId}`,
    type: "anime",
    source: "anilist",
    tmdbId: null,
    anilistId: null,
    mangadexId: null,
    malId,
    title: resolvedTitle,
    posterUrl,
    backdropUrl: null,
    synopsis: anime.synopsis,
    year,
    score: anime.score,
    genres,
    status: anime.status,
    runtime: null,
    totalEpisodes: anime.episodes,
    totalChapters: null,
    totalSeasons: null,
    studios: [],
    episodes: [],
    chapters: [],
    related: [],
    tmdbProviders: null,
    autoWatchOptions: getAllWatchOptions({ type: "anime", title: resolvedTitle }),
    animeEpisodes,
    about: {
      releaseDate: anime.aired.from,
      originalTitle,
      status: anime.status,
    },
  };
}

export async function getDetail(
  type: ReelItemType,
  source: string,
  id: string,
  country: string,
  fallback?: { title?: string | null; year?: number | null }
): Promise<DetailData | null> {
  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  try {
    if ((type === "movie" || type === "series" || type === "anime") && source === "tmdb") {
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
        const movieYear = m.release_date ? Number.parseInt(m.release_date.slice(0, 4), 10) || null : null;
        const movieCrew = m.credits?.crew ?? [];
        const directors = uniqueNames(movieCrew.filter((credit) => credit.job === "Director").map((credit) => credit.name));
        const writers = uniqueNames(
          movieCrew
            .filter((credit) => credit.department === "Writing" || ["Writer", "Screenplay", "Story"].includes(credit.job))
            .map((credit) => credit.name)
        );
        const movieGenres = (m.genres ?? []).map((genre) => genre.name).filter(Boolean);
        const productionCompanies = uniqueNames((m.production_companies ?? []).map((company) => company.name), 10);
        const countries = uniqueNames((m.production_countries ?? []).map((entry) => entry.name), 6);
        const originalLanguage =
          (m.spoken_languages ?? []).find((language) => language.iso_639_1 === m.original_language)?.english_name ??
          (m.original_language ? m.original_language.toUpperCase() : null);
        indexTitle({
          mediaKey: `tmdb-${numId}`,
          mediaType: "movie",
          title: m.title,
          year: movieYear,
          posterUrl: m.poster_path ? getPosterUrl(m.poster_path) : null,
          synopsis: m.overview || null,
          genres: movieGenres,
        });
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
          year: movieYear,
          score: m.vote_average > 0 ? m.vote_average : null,
          genres: movieGenres,
          status: m.status || null,
          runtime: m.runtime,
          totalEpisodes: null,
          totalChapters: null,
          totalSeasons: null,
          studios: productionCompanies,
          episodes: [],
          chapters: [],
          related: [],
          tmdbProviders: providers,
          autoWatchOptions: getAllWatchOptions({ type: "movie", title: m.title, tmdbProviders: providers }),
          cast,
          ratings,
          about: {
            releaseDate: m.release_date || null,
            certification: movieCertification(m.release_dates?.results, country),
            originalTitle: m.original_title && m.original_title !== m.title ? m.original_title : null,
            status: m.status || null,
            directors,
            writers,
            productionCompanies,
            countries,
            originalLanguage,
              budget: m.budget > 0 ? m.budget : null,
              revenue: m.revenue > 0 ? m.revenue : null,
              collection: m.belongs_to_collection?.name ?? null,
              collectionId: m.belongs_to_collection?.id ?? null,
            },
          galleryImages: galleryImages(m.images),
        };
      }
      const isAnime = type === "anime";
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
      const seriesYear = s.first_air_date ? Number.parseInt(s.first_air_date.slice(0, 4), 10) || null : null;
      const seriesGenres = (s.genres ?? []).map((genre) => genre.name).filter(Boolean);
      const productionCompanies = uniqueNames((s.production_companies ?? []).map((company) => company.name), 10);
      const countries = uniqueNames(
        (s.production_countries ?? []).map((entry) => entry.name).length > 0
          ? (s.production_countries ?? []).map((entry) => entry.name)
          : (s.origin_country ?? []),
        6
      );
      indexTitle({
        mediaKey: `tmdb-${numId}`,
        mediaType: isAnime ? "anime" : "series",
        title: s.name,
        year: seriesYear,
        posterUrl: s.poster_path ? getPosterUrl(s.poster_path) : null,
        synopsis: s.overview || null,
        genres: seriesGenres,
      });
      return {
        id: `tmdb-${numId}`,
        type: isAnime ? "anime" : "series",
        source: "tmdb",
        tmdbId: numId,
        anilistId: null,
        mangadexId: null,
        malId: null,
        title: s.name,
        posterUrl: s.poster_path ? getPosterUrl(s.poster_path) : null,
        backdropUrl: s.backdrop_path ? getBackdropUrl(s.backdrop_path) : null,
        synopsis: s.overview || null,
        year: seriesYear,
        score: s.vote_average > 0 ? s.vote_average : null,
        genres: seriesGenres,
        status: s.status,
        runtime: s.episode_run_time?.[0] ?? null,
        totalEpisodes: s.number_of_episodes,
        totalChapters: null,
        totalSeasons: s.number_of_seasons,
        studios: productionCompanies,
        episodes,
        chapters: [],
        related: [],
        tmdbProviders: providers,
        autoWatchOptions: getAllWatchOptions({ type: isAnime ? "anime" : "series", title: s.name, tmdbProviders: providers }),
        cast: seriesCast,
        ratings: seriesRatings,
        animeEpisodes: isAnime
          ? episodes.map((episode) => ({
              mal_id: episode.episode_number,
              title: episode.name || `Episode ${episode.episode_number}`,
              aired: episode.air_date || "",
              filler: false,
              recap: false,
            }))
          : undefined,
        about: {
          releaseDate: s.first_air_date || null,
          lastAirDate: s.last_air_date || null,
          certification: seriesCertification(s.content_ratings?.results, country),
          originalTitle: s.original_name && s.original_name !== s.name ? s.original_name : null,
          status: s.status || null,
          seriesType: s.type || null,
          creators: uniqueNames((s.created_by ?? []).map((creator) => creator.name)),
          productionCompanies,
          networks: uniqueNames((s.networks ?? []).map((network) => network.name), 8),
          countries,
          originalLanguage: s.original_language ? s.original_language.toUpperCase() : null,
        },
        galleryImages: galleryImages(s.images),
      };
    }

    if (type === "anime" && source === "anilist" && id.startsWith("jikan-")) {
      const malId = Number.parseInt(id.slice("jikan-".length), 10);
      return await getJikanAnimeDetail(malId);
    }

    if (type === "anime" || (source === "anilist" && (type === "manga" || type === "manhwa"))) {
      const anilistId = Number.parseInt(id, 10);
      let media;
      try {
        media = await getAniListMedia(anilistId);
      } catch (error) {
        if (type === "anime" && fallback?.title?.trim()) {
          return await getJikanAnimeFallback(anilistId, fallback.title.trim(), fallback.year);
        }
        throw error;
      }
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

      // Jikan can lag behind AniList for brand-new seasonal shows. AniList's
      // next-airing record still tells us exactly how many episodes have aired,
      // so keep the tracker usable until full episode metadata arrives.
      if (!isManga && animeEpisodes.length === 0 && media.nextAiringEpisode?.episode) {
        const releasedCount = Math.max(0, media.nextAiringEpisode.episode - 1);
        animeEpisodes = Array.from({ length: releasedCount }, (_, index) => ({
          mal_id: index + 1,
          title: `Episode ${index + 1}`,
          aired: "",
          filler: false,
          recap: false,
        }));
      }

      const anilistTitle = media.title.english ?? media.title.romaji;
      indexTitle({
        mediaKey: `anilist-${media.id}`,
        mediaType: isManga ? "manga" : "anime",
        title: anilistTitle,
        altTitles: [media.title.romaji],
        year: media.seasonYear,
        posterUrl: media.coverImage.extraLarge ?? media.coverImage.large,
        synopsis: media.description ? formatAniListDescription(media.description) : null,
        genres: media.genres,
      });
      return {
        id: `anilist-${media.id}`,
        type,
        source: "anilist",
        tmdbId: null,
        anilistId: media.id,
        mangadexId: null,
        malId: media.idMal,
        title: anilistTitle,
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
        about: {
          originalTitle: media.title.romaji !== anilistTitle ? media.title.romaji : null,
        },
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
      const mangaGenres = manga.attributes.tags.map((t) => t.attributes.name.en).filter(Boolean).slice(0, 8);
      indexTitle({
        mediaKey: `mangadex-${manga.id}`,
        mediaType: type === "manhwa" ? "manhwa" : "manga",
        title,
        year: manga.attributes.year,
        posterUrl: coverUrl,
        synopsis: manga.attributes.description.en ?? null,
        genres: mangaGenres,
      });
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
        genres: mangaGenres,
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
