import type { ReelItem } from "@core/storage/schema";

function numericId(value: number | null | undefined, fallback: string, prefix: string) {
  if (value !== null && value !== undefined && Number.isFinite(value)) return String(value);
  const match = fallback.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
  return match?.[1] ?? null;
}

export function libraryItemHref(item: ReelItem): string {
  if (item.type === "comic") {
    const id = numericId(null, item.id, "comicvine");
    return id ? `/comic/${id}` : `/search?q=${encodeURIComponent(item.title)}`;
  }

  if (item.source === "tmdb") {
    const id = numericId(item.tmdbId, item.id, "tmdb");
    return id ? `/title/${item.type}/tmdb/${id}` : `/search?q=${encodeURIComponent(item.title)}`;
  }

  if (item.source === "anilist") {
    const id = numericId(item.anilistId, item.id, "anilist");
    return id ? `/title/${item.type}/anilist/${id}` : `/search?q=${encodeURIComponent(item.title)}`;
  }

  if (item.source === "mangadex") {
    const id = item.mangadexId ?? item.id.match(/^mangadex-(.+)$/i)?.[1] ?? null;
    return id ? `/title/${item.type}/mangadex/${encodeURIComponent(id)}` : `/search?q=${encodeURIComponent(item.title)}`;
  }

  return `/search?q=${encodeURIComponent(item.title)}`;
}
