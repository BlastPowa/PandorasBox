import { setupVideoTracking, extractNumber } from "./lib/videoTracker";

function getTitle(): string {
  const titleEl = document.querySelector<HTMLElement>('[data-uia="video-title"]');
  if (titleEl) {
    const heading = titleEl.querySelector("h4");
    if (heading && heading.textContent) {
      return heading.textContent.trim();
    }
    if (titleEl.textContent) {
      return titleEl.textContent.trim();
    }
  }
  return document.title.replace(/\s*[-|]\s*Netflix.*$/i, "").trim();
}

function getEpisodeNumber(): number | null {
  const titleEl = document.querySelector<HTMLElement>('[data-uia="video-title"]');
  const text = titleEl?.textContent ?? document.title;
  return extractNumber(text, [/E(\d+)/i, /Episode\s+(\d+)/i, /Ep\.?\s*(\d+)/i]);
}

function getSeasonNumber(): number | null {
  const titleEl = document.querySelector<HTMLElement>('[data-uia="video-title"]');
  const text = titleEl?.textContent ?? document.title;
  return extractNumber(text, [/S(\d+)\s*:?\s*E\d+/i, /Season\s+(\d+)/i]);
}

setupVideoTracking({
  site: "netflix",
  getTitle,
  getEpisodeNumber,
  getSeasonNumber,
});
