import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

function getPlayerText(): string {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2"))
    .map((node) => node.textContent?.trim())
    .filter((value): value is string => Boolean(value));
  return `${headings.slice(0, 4).join(" ")} ${document.title}`.trim();
}

function getTitle(): string {
  const ogTitle = document
    .querySelector<HTMLMetaElement>('meta[property="og:title"]')
    ?.content.trim();
  const title = ogTitle || document.title;
  return title.replace(/\s*[-|]\s*Disney\+.*$/i, "").trim();
}

function getEpisodeNumber(): number | null {
  return extractNumber(getPlayerText(), [/\bE(\d+)\b/i, /Episode\s+(\d+)/i, /Ep\.?\s*(\d+)/i]);
}

function getSeasonNumber(): number | null {
  return extractNumber(getPlayerText(), [/\bS(\d+)\b/i, /Season\s+(\d+)/i]);
}

setupVideoTracking({
  site: "disneyplus",
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
});
