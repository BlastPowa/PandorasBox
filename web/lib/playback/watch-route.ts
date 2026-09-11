import type { UnifiedSearchResult } from "@core/utils/search";

export function pboxWatchHref(item: UnifiedSearchResult): string | null {
  if (item.type !== "movie" && item.type !== "series" && item.type !== "anime") return null;
  const referenceId = String(item.anilistId ?? item.tmdbId ?? item.mangadexId ?? item.id);
  const pathname = `/watch/${item.type}/${encodeURIComponent(item.source)}/${encodeURIComponent(referenceId)}`;
  if (item.type !== "anime") return pathname;

  const query = new URLSearchParams({ title: item.title });
  if (item.year) query.set("year", String(item.year));
  return `${pathname}?${query.toString()}`;
}
