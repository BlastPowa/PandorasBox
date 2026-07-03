const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  runtime: number | null;
}

export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
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

async function tmdbFetch<T>(path: string, apiKey: string, extraParams?: Record<string, string>): Promise<T> {
  try {
    const response = await fetch(buildUrl(path, apiKey, extraParams));
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
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/search/movie", resolvedKey, { query });
  return data.results;
}

export async function searchSeries(query: string, apiKey: string): Promise<TMDBSeries[]> {
  const resolvedKey = resolveApiKey(apiKey);
  const data = await tmdbFetch<{ results: TMDBSeries[] }>("/search/tv", resolvedKey, { query });
  return data.results;
}

export async function getMovieDetails(id: number, apiKey: string): Promise<TMDBMovie> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBMovie>(`/movie/${id}`, resolvedKey, { append_to_response: "credits" });
}

export async function getSeriesDetails(id: number, apiKey: string): Promise<TMDBSeries> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBSeries>(`/tv/${id}`, resolvedKey, { append_to_response: "credits,seasons" });
}

export async function getSeasonDetails(
  seriesId: number,
  seasonNumber: number,
  apiKey: string
): Promise<TMDBSeason> {
  const resolvedKey = resolveApiKey(apiKey);
  return tmdbFetch<TMDBSeason>(`/tv/${seriesId}/season/${seasonNumber}`, resolvedKey);
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
