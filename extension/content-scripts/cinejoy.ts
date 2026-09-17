import { setupVideoTracking } from "./lib/videoTracker";

interface CinejoyRoute {
  mediaType: "movie" | "tv";
  tmdbId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

function parseRoute(url: string): CinejoyRoute | null {
  const match = url.match(/\/watch\/(movie|tv)\/(\d+)(?:\/(\d+)\/(\d+))?/i);
  if (!match) return null;
  const tmdbId = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(tmdbId)) return null;
  return {
    mediaType: match[1]?.toLowerCase() === "movie" ? "movie" : "tv",
    tmdbId,
    seasonNumber: match[3] ? Number.parseInt(match[3], 10) : null,
    episodeNumber: match[4] ? Number.parseInt(match[4], 10) : null,
  };
}

function route(): CinejoyRoute | null {
  return parseRoute(window.location.href);
}

function title(): string {
  const metaTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  return (metaTitle || document.title)
    .replace(/^watch\s+/i, "")
    .replace(/\s*[-|–—]\s*(?:cinejoy|watch online).*$/i, "")
    .trim();
}

setupVideoTracking({
  site: "cinejoy",
  getTitle: title,
  getTmdbId: () => route()?.tmdbId ?? null,
  getMediaType: () => route()?.mediaType ?? null,
  getSeasonNumber: () => route()?.seasonNumber ?? null,
  getEpisodeNumber: () => route()?.episodeNumber ?? null,
  minDurationSeconds: 300,
});
