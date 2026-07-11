const MANGADEX_API_BASE_URL = "https://api.mangadex.org";
const MANGADEX_UPLOADS_BASE_URL = "https://uploads.mangadex.org";
const MANGADEX_SITE_BASE_URL = "https://mangadex.org";

export interface MangaDexManga {
  id: string;
  attributes: {
    title: { en?: string; ja?: string; [key: string]: string | undefined };
    description: { en?: string; [key: string]: string | undefined };
    status: string;
    year: number | null;
    tags: { attributes: { name: { en: string } } }[];
    lastVolume: string | null;
    lastChapter: string | null;
  };
  relationships: {
    type: string;
    id: string;
    attributes?: { fileName?: string };
  }[];
}

export interface MangaDexChapter {
  id: string;
  attributes: {
    chapter: string | null;
    title: string | null;
    publishAt: string;
    pages: number;
    translatedLanguage: string;
  };
  relationships: {
    type: string;
    attributes?: { name?: string };
  }[];
}

async function mangaDexFetch<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${MANGADEX_API_BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`MangaDex request failed with status ${response.status}: ${path}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`MangaDex request error for ${path}: ${error.message}`);
    }
    throw new Error(`MangaDex request error for ${path}: unknown error`);
  }
}

export async function searchMangaDex(query: string): Promise<MangaDexManga[]> {
  const data = await mangaDexFetch<{ data: MangaDexManga[] }>(
    `/manga?title=${encodeURIComponent(query)}&limit=10&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`
  );
  return data.data;
}

export async function getMangaDexManga(id: string): Promise<MangaDexManga> {
  const data = await mangaDexFetch<{ data: MangaDexManga }>(
    `/manga/${id}?includes[]=cover_art`
  );
  return data.data;
}

export async function getMangaDexChapters(
  mangaId: string,
  language?: string,
  offset?: number
): Promise<MangaDexChapter[]> {
  const data = await mangaDexFetch<{ data: MangaDexChapter[] }>(
    `/manga/${mangaId}/feed?translatedLanguage[]=${encodeURIComponent(language ?? "en")}&order[chapter]=asc&limit=100&offset=${offset ?? 0}`
  );
  return data.data;
}

export function getMangaDexCoverUrl(mangaId: string, fileName: string): string {
  return `${MANGADEX_UPLOADS_BASE_URL}/covers/${mangaId}/${fileName}.512.jpg`;
}

export function getMangaDexReadUrl(chapterId: string): string {
  return `${MANGADEX_SITE_BASE_URL}/chapter/${chapterId}`;
}

export async function getLatestChapter(mangaId: string): Promise<MangaDexChapter | null> {
  const data = await mangaDexFetch<{ data: MangaDexChapter[] }>(
    `/manga/${mangaId}/feed?translatedLanguage[]=en&order[publishAt]=desc&limit=1`
  );
  return data.data[0] ?? null;
}
