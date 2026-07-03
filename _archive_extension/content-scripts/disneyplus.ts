import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

function getTitle(): string {
  return document.title.replace(/\s*[-|]\s*Disney\+.*$/i, "").trim();
}

function getEpisodeNumber(): number | null {
  return extractNumber(document.title, [/E(\d+)/i, /Episode\s+(\d+)/i]);
}

function getSeasonNumber(): number | null {
  return extractNumber(document.title, [/S(\d+)/i, /Season\s+(\d+)/i]);
}

setupVideoTracking({
  site: "disneyplus",
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
});
