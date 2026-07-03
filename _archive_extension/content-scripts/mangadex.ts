import { setupScrollTracking } from "./lib/scrollTracker";
import { extractNumber } from "./lib/videoTracker";

function isChapterPage(): boolean {
  return /\/chapter\//.test(window.location.pathname);
}

function getTitle(): string {
  const mangaLink = document.querySelector<HTMLElement>("a[href*='/title/']");
  if (mangaLink && mangaLink.textContent && mangaLink.textContent.trim().length > 0) {
    return mangaLink.textContent.trim();
  }
  return document.title
    .replace(/\s*[-|]\s*MangaDex.*$/i, "")
    .replace(/\s*[-—]\s*(Ch\.|Chapter).*$/i, "")
    .trim();
}

function getChapterNumber(): number | null {
  if (!isChapterPage()) {
    return null;
  }
  const fromTitle = extractNumber(document.title, [/Ch\.?\s*([\d.]+)/i, /Chapter\s+([\d.]+)/i]);
  if (fromTitle !== null) {
    return fromTitle;
  }
  const chapterLabel = document.querySelector<HTMLElement>("[class*='chapter']");
  if (chapterLabel && chapterLabel.textContent) {
    return extractNumber(chapterLabel.textContent, [/Ch\.?\s*([\d.]+)/i, /Chapter\s+([\d.]+)/i]);
  }
  return null;
}

setupScrollTracking({
  site: "mangadex",
  getTitle,
  getChapterNumber,
});
