import { setupScrollTracking } from "./lib/scrollTracker";
import { extractNumber } from "./lib/videoTracker";

function isViewerPage(): boolean {
  return /\/viewer/.test(window.location.pathname) || /episode_no=\d+/.test(window.location.search);
}

function getTitle(): string {
  const titleEl = document.querySelector<HTMLElement>(".subj_info .subj_episode, .subj, h1");
  if (titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0) {
    return titleEl.textContent.trim();
  }
  return document.title.replace(/\s*[-|]\s*WEBTOON.*$/i, "").trim();
}

function getChapterNumber(): number | null {
  if (!isViewerPage()) {
    return null;
  }
  const fromUrl = extractNumber(window.location.search, [/episode_no=(\d+)/i]);
  if (fromUrl !== null) {
    return fromUrl;
  }
  return extractNumber(document.title, [/Ep\.?\s*(\d+)/i, /Episode\s+(\d+)/i, /#(\d+)/]);
}

setupScrollTracking({
  site: "webtoon",
  getTitle,
  getChapterNumber,
});
