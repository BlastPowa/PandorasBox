import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

const MIN_VIDEO_DURATION_SECONDS = 300;
const VERY_LONG_VIDEO_SECONDS = 45 * 60;

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
const LONG_FORM_HINT = /\b(watch|movie|film|episode|season|series|stream|player|cinema|anime)\b/i;

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function hasStructuredEntertainmentMetadata(): boolean {
  const ogType = document.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content ?? "";
  if (/video\.(movie|episode)|movie|tv/i.test(ogType)) return true;

  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))
    .slice(0, 8)
    .some((node) => /"@type"\s*:\s*(?:"(?:Movie|TVSeries|TVEpisode|VideoObject)"|\[[^\]]*"(?:Movie|TVSeries|TVEpisode|VideoObject)")/i.test(node.textContent ?? ""));
}

function shouldTrackUniversal(video: HTMLVideoElement): boolean {
  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_HOSTS.some((domain) => hostnameMatches(hostname, domain))) return false;

  const pageText = `${window.location.pathname} ${document.title}`;
  if (SHORT_FORM_HINT.test(pageText)) return false;

  const renderedWidth = video.getBoundingClientRect().width;
  const renderedHeight = video.getBoundingClientRect().height;
  const playerIsProminent = renderedWidth >= 420 && renderedHeight >= 220;
  if (!playerIsProminent) return false;

  const hasLongFormRoute = LONG_FORM_HINT.test(window.location.pathname);
  return hasStructuredEntertainmentMetadata() || hasLongFormRoute || video.duration >= VERY_LONG_VIDEO_SECONDS;
}

function getTitle(): string {
  return document.title
    .replace(/\s*[-|–—]\s*[^-|–—]*$/, "")
    .replace(/^Watch\s+/i, "")
    .trim() || document.title.trim();
}

function getEpisodeNumber(): number | null {
  const combined = `${window.location.href} ${document.title}`;
  return extractNumber(combined, [
    /episode[/-](\d+)/i,
    /Episode\s+(\d+)/i,
    /Ep\.?\s*(\d+)/i,
    /[?&]ep=(\d+)/i,
    /\bE(\d+)\b/i,
  ]);
}

function getSeasonNumber(): number | null {
  const combined = `${window.location.href} ${document.title}`;
  return extractNumber(combined, [/season[/-](\d+)/i, /Season\s+(\d+)/i, /\bS(\d+)\b/i]);
}

setupVideoTracking({
  site: window.location.hostname.replace(/^www\./, ""),
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
  minDurationSeconds: MIN_VIDEO_DURATION_SECONDS,
  shouldTrack: shouldTrackUniversal,
});
