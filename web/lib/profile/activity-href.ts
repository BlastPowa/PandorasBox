const TITLE_TYPES = new Set(["movie", "series", "anime", "manga", "manhwa"]);
const TITLE_SOURCES = new Set(["tmdb", "anilist", "mangadex"]);

function parseMediaKey(mediaKey: string): { source: string; id: string } | null {
  const colon = mediaKey.indexOf(":");
  if (colon > 0 && colon < mediaKey.length - 1) {
    return { source: mediaKey.slice(0, colon).toLowerCase(), id: mediaKey.slice(colon + 1) };
  }

  const hyphen = mediaKey.indexOf("-");
  if (hyphen > 0 && hyphen < mediaKey.length - 1) {
    return { source: mediaKey.slice(0, hyphen).toLowerCase(), id: mediaKey.slice(hyphen + 1) };
  }

  return /^\d+$/.test(mediaKey) ? { source: "tmdb", id: mediaKey } : null;
}

export function profileActivityHref(mediaType: string | null, mediaKey: string | null, title?: string | null): string | null {
  if (!mediaType || !mediaKey) return null;
  const parsed = parseMediaKey(mediaKey.trim());
  const fallback = title ? `/search?q=${encodeURIComponent(title)}` : null;
  if (!parsed?.id) return fallback;

  if (mediaType === "comic") {
    return parsed.source === "comicvine" ? `/comic/${encodeURIComponent(parsed.id)}` : fallback;
  }

  if (!TITLE_TYPES.has(mediaType) || !TITLE_SOURCES.has(parsed.source)) return fallback;
  return `/title/${mediaType}/${parsed.source}/${encodeURIComponent(parsed.id)}`;
}
