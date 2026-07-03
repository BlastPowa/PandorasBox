import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

function getTitle(): string {
  const heading = document.querySelector<HTMLElement>("h1, h2, .title, [class*='title']");
  if (heading && heading.textContent && heading.textContent.trim().length > 0) {
    return heading.textContent.trim();
  }
  return document.title.replace(/\s*[-|]\s*CinemaOS.*$/i, "").trim();
}

function getEpisodeNumber(): number | null {
  const fromUrl = extractNumber(window.location.href, [
    /episode[/-](\d+)/i,
    /ep[/-](\d+)/i,
    /[?&]ep=(\d+)/i,
  ]);
  if (fromUrl !== null) {
    return fromUrl;
  }
  const heading = document.querySelector<HTMLElement>("h1, h2, [class*='episode']");
  const text = heading?.textContent ?? document.title;
  return extractNumber(text, [/Episode\s+(\d+)/i, /Ep\.?\s*(\d+)/i, /E(\d+)/i]);
}

function getSeasonNumber(): number | null {
  return extractNumber(window.location.href + " " + document.title, [
    /season[/-](\d+)/i,
    /S(\d+)/i,
  ]);
}

setupVideoTracking({
  site: "cinemaos",
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
});
