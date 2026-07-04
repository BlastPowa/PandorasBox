const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const MIN_REQUEST_INTERVAL_MS = 350;

export interface JikanAnime {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string | null;
  episodes: number | null;
  score: number | null;
  genres: { name: string }[];
  status: string;
  aired: { from: string | null };
  streaming: { name: string; url: string }[];
}

export interface JikanManga {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string | null;
  chapters: number | null;
  volumes: number | null;
  score: number | null;
  genres: { name: string }[];
  status: string;
  published: { from: string | null };
}

export interface JikanEpisode {
  mal_id: number;
  title: string;
  aired: string;
  filler: boolean;
  recap: boolean;
}

export interface JikanEpisodeDetail {
  mal_id: number;
  title: string;
  title_japanese: string | null;
  aired: string | null;
  synopsis: string | null;
}

let queueTail: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queueTail.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await delay(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    lastRequestAt = Date.now();
    return task();
  });
  queueTail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function jikanFetch<T>(path: string): Promise<T> {
  return enqueue(async () => {
    try {
      const response = await fetch(`${JIKAN_BASE_URL}${path}`);
      if (!response.ok) {
        throw new Error(`Jikan request failed with status ${response.status}: ${path}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Jikan request error for ${path}: ${error.message}`);
      }
      throw new Error(`Jikan request error for ${path}: unknown error`);
    }
  });
}

export async function searchJikanAnime(query: string): Promise<JikanAnime[]> {
  const data = await jikanFetch<{ data: JikanAnime[] }>(
    `/anime?q=${encodeURIComponent(query)}&limit=10`
  );
  return data.data;
}

export async function searchJikanManga(query: string): Promise<JikanManga[]> {
  const data = await jikanFetch<{ data: JikanManga[] }>(
    `/manga?q=${encodeURIComponent(query)}&limit=10`
  );
  return data.data;
}

export async function getJikanAnime(malId: number): Promise<JikanAnime> {
  const data = await jikanFetch<{ data: JikanAnime }>(`/anime/${malId}`);
  return data.data;
}

export async function getJikanAnimeEpisodes(malId: number, page?: number): Promise<JikanEpisode[]> {
  const data = await jikanFetch<{ data: JikanEpisode[] }>(
    `/anime/${malId}/episodes?page=${page ?? 1}`
  );
  return data.data;
}

export async function getJikanEpisodeDetail(malId: number, episodeNumber: number): Promise<JikanEpisodeDetail | null> {
  try {
    const data = await jikanFetch<{ data: JikanEpisodeDetail }>(`/anime/${malId}/episodes/${episodeNumber}`);
    return data.data;
  } catch {
    return null;
  }
}

export async function getJikanStreamingLinks(malId: number): Promise<{ name: string; url: string }[]> {
  const data = await jikanFetch<{ data: { name: string; url: string }[] }>(
    `/anime/${malId}/streaming`
  );
  return data.data;
}
