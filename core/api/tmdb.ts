const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres: { id: number; name: string }[];
  runtime: number | null;
  status: string;
  budget: number;
  revenue: number;
  original_language: string;
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  belongs_to_collection: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
  credits?: {
    crew?: { id: number; name: string; department: string; job: string }[];
  };
  images?: TMDBImages;
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string; type: number; release_date: string }[];
    }[];
  };
}

export interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  type: string;
  original_language: string;
  origin_country: string[];
  episode_run_time: number[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  networks: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  images?: TMDBImages;
  content_ratings?: {
    results: { iso_3166_1: string; rating: string }[];
  };
}

export interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
  vote_count?: number;
  iso_639_1?: string | null;
}

export interface TMDBImages {
  backdrops?: TMDBImage[];
  posters?: TMDBImage[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string;
  runtime: number | null;
  still_path: string | null;
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes: TMDBEpisode[];
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBWatchProviders {
  link: string;
  flatrate: TMDBWatchProvider[] | undefined;
  rent: TMDBWatchProvider[] | undefined;
  buy: TMDBWatchProvider[] | undefined;
}

interface EnvHost {
  process?: { env?: Record<string, string | undefined> };
}

function resolveApiKey(apiKey?: string): string {
  const key = apiKey ?? (globalThis as EnvHost).process?.env?.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB API key not provided and TMDB_API_KEY environment variable is not set");
  }
  return key;
}

function buildUrl(path: string, apiKey: string, extraParams?: Record<string, string>): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", apiKey);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function tmdbFetch<T>(path: string, apiKey: string, extraParams?: Record<string, string>, fresh = false): Promise<T> {
  try {
    const response = await fetch(buildUrl(path, apiKey, extraParams), fresh ? { cache: "no-store" } : undefined);
    if (!response.ok) {
      throw new Error(`TMDB request failed with status ${response.status}: ${path}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`TMDB request error for ${path}: ${error.message}`);
    }
    throw new Error(`TMDB request error for ${path}: unknown error`);
  }
}

export async function searchMovies(query: string, apiKey: string): Promise<TMDBMovie[]> {
  const resolvedKey = resolveApiKey(apiKey);
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/search/movie", resolvedKey, {
    query,
    include_adult: "false",
  });
  return data.results.filter((r) => !(r as TMDBMovie & { adult?: boolean }).adult);
}

export async function searchSeries(query: string, apiKey: string): Promise<TMDBSeries[]> {
  const resolvedKey = resolveApiKey(apiKey);
  const data = await tmdbFetch<{ results: TMDBSeries[] }>("/search/tv", resolvedKey, {
    query,
    include_adult: "false",
  });
  return data.results.filter((r) => !(r as TMDBSeries & { adult?: boolean }).adult);
}

export async function getMovieDetails(id: number, apiKey: string): Promise<TMDBMovie> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBMovie>(`/movie/${id}`, resolvedKey, { append_to_response: "credits,images,release_dates" }, true);
}

export async function getSeriesDetails(id: number, apiKey: string): Promise<TMDBSeries> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBSeries>(`/tv/${id}`, resolvedKey, { append_to_response: "credits,seasons,images,content_ratings" }, true);
}

export async function getSeasonDetails(
  seriesId: number,
  seasonNumber: number,
  apiKey: string
): Promise<TMDBSeason> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBSeason>(`/tv/${seriesId}/season/${seasonNumber}`, resolvedKey, undefined, true);
}

export async function getMovieWatchProviders(
  id: number,
  countryCode: string,
  apiKey: string
): Promise<TMDBWatchProviders | null> {
  const resolvedKey = resolveApiKey(apiKey);
  const data = await tmdbFetch<{ results: Record<string, TMDBWatchProviders> }>(
    `/movie/${id}/watch/providers`,
    resolvedKey
  );
  return data.results[countryCode] ?? null;
}

export async function getSeriesWatchProviders(
  id: number,
  countryCode: string,
  apiKey: string
): Promise<TMDBWatchProviders | null> {
  const resolvedKey = resolveApiKey(apiKey);
  const data = await tmdbFetch<{ results: Record<string, TMDBWatchProviders> }>(
    `/tv/${id}/watch/providers`,
    resolvedKey
  );
  return data.results[countryCode] ?? null;
}

export function getPosterUrl(path: string, size?: string): string {
  return `${TMDB_IMAGE_BASE_URL}/${size ?? "w500"}${path}`;
}

export function getBackdropUrl(path: string, size?: string): string {
  return `${TMDB_IMAGE_BASE_URL}/${size ?? "w1280"}${path}`;
}
