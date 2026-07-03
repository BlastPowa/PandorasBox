import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

const MIN_VIDEO_DURATION_SECONDS = 300;

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
});
