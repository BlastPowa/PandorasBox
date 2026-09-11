import type { UnifiedSearchResult } from "@core/utils/search";

export function pboxWatchHref(item: UnifiedSearchResult): string | null {
  if (item.type !== "movie" && item.type !== "series" && item.type !== "anime") return null;
  const referenceId = String(item.anilistId ?? item.tmdbId ?? item.mangadexId ?? item.id);
  return `/watch/${item.type}/${encodeURIComponent(item.source)}/${encodeURIComponent(referenceId)}`;
}
