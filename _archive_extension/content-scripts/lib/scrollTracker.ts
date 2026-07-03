import type { ProgressEvent } from "../../../core/storage/progressManager";

export interface ScrollTrackerConfig {
  site: string;
  getTitle: () => string;
  getChapterNumber: () => number | null;
}

const BOTTOM_THRESHOLD = 0.95;
const SCROLL_CHECK_INTERVAL_MS = 2000;

function sendProgress(event: ProgressEvent): void {
  try {
    chrome.runtime.sendMessage({ type: "saveProgress", event }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    return;
  }
}

export function setupScrollTracking(config: ScrollTrackerConfig): void {
  let completedChapterKey: string | null = null;
  let lastUrl = window.location.href;

  function check(): void {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      completedChapterKey = null;
    }
    const chapter = config.getChapterNumber();
    if (chapter === null) {
      return;
    }
    const root = document.documentElement;
    const scrollBottom = window.scrollY + window.innerHeight;
    if (scrollBottom < root.scrollHeight * BOTTOM_THRESHOLD) {
      return;
    }
    const key = `${window.location.pathname}|${chapter}`;
    if (completedChapterKey === key) {
      return;
    }
    completedChapterKey = key;
    const event: ProgressEvent = {
      itemId: null,
      site: config.site,
      url: window.location.href,
      title: config.getTitle(),
      episodeNumber: null,
      seasonNumber: null,
      chapterNumber: chapter,
      timestamp: null,
      duration: null,
      percentComplete: 100,
    };
    sendProgress(event);
  }

  function start(): void {
    window.setInterval(check, SCROLL_CHECK_INTERVAL_MS);
    window.addEventListener("scroll", check, { passive: true });
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        completedChapterKey = null;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}
