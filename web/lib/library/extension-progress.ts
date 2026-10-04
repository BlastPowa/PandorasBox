import type { ReelItem } from "@core/storage/schema";
export const EXTENSION_LIBRARY_CHANNEL = "__pbox_extension_library_v1__";
export function mergeExtensionProgress(library: ReelItem[], incoming: unknown[]) {
  const items = [...library]; let changed = false;
  for (const value of incoming) {
    if (!value || typeof value !== "object") continue;
    const item = value as ReelItem;
    if (typeof item.id !== "string" || typeof item.title !== "string" || !["movie", "series", "anime"].includes(item.type)
      || !["watching", "rewatching", "completed"].includes(item.status) || !item.lastWatchedSite || !item.progress || !Array.isArray(item.genres)
      || !Number.isFinite(Date.parse(item.updatedAt))) continue;
    if (!((item.progress.movieTimestamp ?? 0) > 0 || (item.progress.episodeTimestamp ?? 0) > 0 || (item.progress.currentEpisodePercent ?? 0) > 0 || item.progress.percentComplete > 0 || item.progress.lastCompletedAt)) continue;
    const index = items.findIndex(existing => (existing.type === item.type || (["series", "anime"].includes(existing.type) && ["series", "anime"].includes(item.type))) &&
      (existing.id === item.id || (item.tmdbId != null && existing.tmdbId === item.tmdbId) || (item.anilistId != null && existing.anilistId === item.anilistId) || (item.malId != null && existing.malId === item.malId)));
    if (index === -1) { items.push(item); changed = true; continue; }
    const existing = items[index];
    if (Date.parse(item.updatedAt) <= Date.parse(existing.updatedAt)) continue;
    items[index] = { ...existing, progress: { ...existing.progress, ...item.progress }, status: item.status,
      lastWatchedSite: item.lastWatchedSite, lastWatchedUrl: item.lastWatchedUrl, updatedAt: item.updatedAt, completedAt: item.completedAt,
      posterUrl: existing.posterUrl ?? item.posterUrl, backdropUrl: existing.backdropUrl ?? item.backdropUrl };
    changed = true;
  }
  return { items, changed };
}
