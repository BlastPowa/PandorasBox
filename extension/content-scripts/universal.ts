import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

const MIN_VIDEO_DURATION_SECONDS = 300;
const VERY_LONG_VIDEO_SECONDS = 45 * 60;
const CONTEXT_CHANNEL = "__pandora_box_media_context_v1__";

const BLOCKED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "reddit.com",
  "twitch.tv",
];

const SHORT_FORM_HINT = /\b(shorts?|reels?|clips?|trailer|teaser|preview|promo|advert|advertisement|music video|livestream|live stream)\b/i;
const LONG_FORM_HINT = /\b(watch|movie|film|episode|season|series|stream|player|cinema|anime|show)\b/i;

type MediaType = "movie" | "tv" | null;

type MediaContext = {
  title: string;
  episodeNumber: number | null;
  seasonNumber: number | null;
  mediaType: MediaType;
  tmdbId: number | null;
  entertainmentHint: boolean;
  url: string;
};

type ContextMessage =
  | { channel: typeof CONTEXT_CHANNEL; type: "request" }
  | { channel: typeof CONTEXT_CHANNEL; type: "response"; context: MediaContext };

let parentContext: MediaContext | null = null;
let localContextCache: { key: string; expiresAt: number; context: MediaContext } | null = null;

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function cleanTitle(value: string): string {
  return value
    .replace(/^\s*(?:watch|stream)\s+/i, "")
    .replace(/\s*(?:[-|–—]\s*)?(?:watch|stream)\s+(?:online|free)(?:\s+.*)?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function structuredMetadataText(): string {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))
    .slice(0, 10)
    .map((node) => node.textContent ?? "")
    .join("\n");
}

function structuredMediaType(metadata: string): MediaType {
  if (/"@type"\s*:\s*(?:"Movie"|\[[^\]]*"Movie")/i.test(metadata)) return "movie";
  if (/"@type"\s*:\s*(?:"(?:TVSeries|TVEpisode)"|\[[^\]]*"(?:TVSeries|TVEpisode)")/i.test(metadata)) return "tv";
  return null;
}

function pageTitle(): string {
  const candidates = [
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content,
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content,
    document.querySelector<HTMLElement>("h1")?.innerText,
    document.title,
  ];
  for (const candidate of candidates) {
    const title = cleanTitle(candidate ?? "");
    if (title.length >= 2) return title;
  }
  return cleanTitle(document.title);
}

function getEpisodeNumber(text: string): number | null {
  return extractNumber(text, [
    /episode[/-](\d+)/i,
    /Episode\s+(\d+)/i,
    /Ep\.?\s*(\d+)/i,
    /[?&](?:ep|episode)=(\d+)/i,
    /\bS\d{1,2}E(\d{1,3})\b/i,
    /\bE(\d+)\b/i,
  ]);
}

function getSeasonNumber(text: string): number | null {
  return extractNumber(text, [
    /season[/-](\d+)/i,
    /Season\s+(\d+)/i,
    /[?&]season=(\d+)/i,
    /\bS(\d{1,2})E\d{1,3}\b/i,
    /\bS(\d+)\b/i,
  ]);
}

function explicitTmdbId(metadata: string): number | null {
  const attr = document.querySelector<HTMLElement>("[data-tmdb-id]")?.dataset.tmdbId;
  if (attr && /^\d+$/.test(attr)) return Number.parseInt(attr, 10);

  try {
    const parsed = new URL(window.location.href);
    for (const key of ["tmdb", "tmdb_id", "tmdbId"]) {
      const value = parsed.searchParams.get(key);
      if (value && /^\d+$/.test(value)) return Number.parseInt(value, 10);
    }
    const pathMatch = parsed.pathname.match(/\btmdb(?:[-_/](?:movie|tv))?[-_/](\d+)\b/i);
    if (pathMatch?.[1]) return Number.parseInt(pathMatch[1], 10);
  } catch {
    // Keep generic tracking alive on malformed URLs.
  }

  const metadataMatch = metadata.match(/"tmdb(?:Id|_id)"\s*:\s*"?(\d+)"?/i);
  return metadataMatch?.[1] ? Number.parseInt(metadataMatch[1], 10) : null;
}

function inferMediaType(text: string, metadata: string, episodeNumber: number | null): MediaType {
  const structured = structuredMediaType(metadata);
  if (structured) return structured;
  if (episodeNumber !== null) return "tv";
  if (/(?:^|[/?#&_-])(movie|film)(?:[/?#&=_-]|$)/i.test(text)) return "movie";
  if (/(?:^|[/?#&_-])(tv|series|show|episode|anime)(?:[/?#&=_-]|$)/i.test(text)) return "tv";
  return null;
}

function buildLocalContext(): MediaContext {
  const cacheKey = `${window.location.href}|${document.title}`;
  if (localContextCache && localContextCache.key === cacheKey && localContextCache.expiresAt > Date.now()) {
    return localContextCache.context;
  }

  const title = pageTitle();
  const metadata = structuredMetadataText();
  const combined = `${window.location.href} ${title}`;
  const episodeNumber = getEpisodeNumber(combined);
  const seasonNumber = getSeasonNumber(combined);
  const mediaType = inferMediaType(combined, metadata, episodeNumber);
  const entertainmentHint = mediaType !== null
    || LONG_FORM_HINT.test(window.location.pathname)
    || structuredMediaType(metadata) !== null;

  const context = {
    title,
    episodeNumber,
    seasonNumber,
    mediaType,
    tmdbId: explicitTmdbId(metadata),
    entertainmentHint,
    url: window.location.href,
  };
  localContextCache = { key: cacheKey, expiresAt: Date.now() + 1000, context };
  return context;
}

function resolvedContext(): MediaContext {
  const local = buildLocalContext();
  if (window.top === window || !parentContext) return local;
  return {
    title: parentContext.title || local.title,
    episodeNumber: parentContext.episodeNumber ?? local.episodeNumber,
    seasonNumber: parentContext.seasonNumber ?? local.seasonNumber,
    mediaType: parentContext.mediaType ?? local.mediaType,
    tmdbId: parentContext.tmdbId ?? local.tmdbId,
    entertainmentHint: parentContext.entertainmentHint || local.entertainmentHint,
    url: parentContext.url || local.url,
  };
}

function isContextMessage(value: unknown): value is ContextMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ContextMessage>;
  return candidate.channel === CONTEXT_CHANNEL && (candidate.type === "request" || candidate.type === "response");
}

function setupFrameContextBridge(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (!isContextMessage(event.data)) return;

    if (window.top === window && event.data.type === "request") {
      const source = event.source as Window | null;
      source?.postMessage({
        channel: CONTEXT_CHANNEL,
        type: "response",
        context: buildLocalContext(),
      } satisfies ContextMessage, "*");
      return;
    }

    if (window.top !== window && event.source === window.top && event.data.type === "response") {
      const context = event.data.context;
      if (context && typeof context.title === "string" && typeof context.url === "string") {
        parentContext = context;
      }
    }
  });

  if (window.top !== window) {
    const requestContext = () => {
      window.top?.postMessage({ channel: CONTEXT_CHANNEL, type: "request" } satisfies ContextMessage, "*");
    };
    requestContext();
    window.setInterval(requestContext, 4000);
  }
}

function shouldTrackUniversal(video: HTMLVideoElement): boolean {
  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_HOSTS.some((domain) => hostnameMatches(hostname, domain))) return false;

  const context = resolvedContext();
  const pageText = `${window.location.pathname} ${context.title}`;
  if (SHORT_FORM_HINT.test(pageText)) return false;

  const rect = video.getBoundingClientRect();
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const playerIsProminent = area >= 90_000 || (rect.width >= 240 && rect.height >= 135 && area / viewportArea >= 0.3);
  if (!playerIsProminent) return false;

  return context.entertainmentHint || video.duration >= VERY_LONG_VIDEO_SECONDS;
}

setupFrameContextBridge();

setupVideoTracking({
  site: window.location.hostname.replace(/^www\./, ""),
  getTitle: () => resolvedContext().title,
  getEpisodeNumber: () => resolvedContext().episodeNumber,
  getSeasonNumber: () => resolvedContext().seasonNumber,
  getTmdbId: () => resolvedContext().tmdbId,
  getMediaType: () => resolvedContext().mediaType,
  minDurationSeconds: MIN_VIDEO_DURATION_SECONDS,
  shouldTrack: shouldTrackUniversal,
});
