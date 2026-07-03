import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

function getTitle(): string {
  const showLink = document.querySelector<HTMLElement>("a.show-title-link, [class*='show-title']");
  if (showLink && showLink.textContent && showLink.textContent.trim().length > 0) {
    return showLink.textContent.trim();
  }
  return document.title
    .replace(/\s*[-|]\s*Crunchyroll.*$/i, "")
    .replace(/^Watch\s+/i, "")
    .trim();
}

function getEpisodeNumber(): number | null {
  const slug = window.location.pathname;
  const fromUrl = extractNumber(slug, [/episode-(\d+)/i, /e(\d+)-/i]);
  if (fromUrl !== null) {
    return fromUrl;
  }
  return extractNumber(document.title, [/Episode\s+(\d+)/i, /E(\d+)/i]);
}

function getSeasonNumber(): number | null {
  return extractNumber(document.title, [/Season\s+(\d+)/i, /S(\d+)/i]);
}

setupVideoTracking({
  site: "crunchyroll",
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
});
