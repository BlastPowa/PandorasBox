import "server-only";
import { unifiedSearch, type UnifiedSearchResult } from "@core/utils/search";
import { searchMangaDex, getMangaDexCoverUrl } from "@core/api/mangadex";
import { searchComics } from "@/lib/comics";
import type { ImportMediaType } from "@/lib/import/types";

export async function runSearch(query: string, requestedTypes?: ImportMediaType[]): Promise<UnifiedSearchResult[]> {
  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  const types = requestedTypes?.length ? new Set(requestedTypes) : null;
  const wants = (type: ImportMediaType) => !types || types.has(type);
  const [unified, mangadex, comics] = await Promise.allSettled([
    unifiedSearch(query, tmdbKey, {
      includeMovies: wants("movie"),
      includeSeries: wants("series"),
      includeAnime: wants("anime"),
      includeManga: wants("manga"),
      includeManhwa: wants("manga"),
    }),
    wants("manga") ? searchMangaDex(query) : Promise.resolve([]),
    wants("comic") ? searchComics(query) : Promise.resolve([]),
  ]);

  const results: UnifiedSearchResult[] = unified.status === "fulfilled" ? unified.value : [];

  if (comics.status === "fulfilled") {
    for (const c of comics.value.slice(0, 12)) {
      results.push({
        id: `comicvine-${c.id}`,
        source: "comicvine",
        type: "comic",
        title: c.name,
        posterUrl: c.coverUrl,
        year: c.startYear,
        synopsis: c.synopsis,
        score: null,
        totalEpisodes: null,
        totalChapters: c.issueCount > 0 ? c.issueCount : null,
        anilistId: null,
        tmdbId: null,
        mangadexId: null,
        malId: null,
      });
    }
  }

  if (mangadex.status === "fulfilled") {
    for (const m of mangadex.value.slice(0, 8)) {
      const cover = m.relationships.find((r) => r.type === "cover_art");
      const title = m.attributes.title.en ?? Object.values(m.attributes.title)[0] ?? "Untitled";
      results.push({
        id: `mangadex-${m.id}`,
        source: "mangadex",
        type: "manga",
        title,
        posterUrl: cover?.attributes?.fileName ? getMangaDexCoverUrl(m.id, cover.attributes.fileName) : null,
        year: m.attributes.year,
        synopsis: m.attributes.description.en ?? null,
        score: null,
        totalEpisodes: null,
        totalChapters: m.attributes.lastChapter ? Number.parseInt(m.attributes.lastChapter, 10) || null : null,
        anilistId: null,
        tmdbId: null,
        mangadexId: m.id,
        malId: null,
      });
    }
  }

  return Array.from(new Map(results.map((result) => [`${result.source}:${result.type}:${result.id}`, result])).values());
}
