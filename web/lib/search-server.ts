import "server-only";
import { unifiedSearch, type UnifiedSearchResult } from "@core/utils/search";
import { searchMangaDex, getMangaDexCoverUrl } from "@core/api/mangadex";

export async function runSearch(query: string): Promise<UnifiedSearchResult[]> {
  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  const [unified, mangadex] = await Promise.allSettled([
    unifiedSearch(query, tmdbKey),
    searchMangaDex(query),
  ]);

  const results: UnifiedSearchResult[] = unified.status === "fulfilled" ? unified.value : [];

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

  return results;
}
