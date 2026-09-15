import type { ProgressEvent } from "../../../core/storage/progressManager";

export interface ScrollTrackerConfig {
  site: string;
  getTitle: () => string;
  getChapterNumber: () => number | null;
}

const BOTTOM_THRESHOLD = 0.95;
const SCROLL_CHECK_INTERVAL_MS = 2000;
const MIN_CHAPTER_VIEW_MS = 5000;
const HEIGHT_STABLE_MS = 1500;
const RETRY_DELAY_MS = 900;
const MAX_SEND_ATTEMPTS = 2;

function sendProgress(event: ProgressEvent, attempt = 0): void {
  try {
    chrome.runtime.sendMessage({ type: "saveProgress", event }, () => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError && attempt < MAX_SEND_ATTEMPTS) {
        window.setTimeout(() => sendProgress(event, attempt + 1), RETRY_DELAY_MS);
      }
    });
  } catch {
    if (attempt < MAX_SEND_ATTEMPTS) {
      window.setTimeout(() => sendProgress(event, attempt + 1), RETRY_DELAY_MS);
    }
  }
}

export function setupScrollTracking(config: ScrollTrackerConfig): void {
  let completedChapterKey: string | null = null;
  let lastUrl = window.location.href;
  let chapterOpenedAt = Date.now();
  let lastScrollHeight = 0;
  let lastHeightChangeAt = Date.now();

  function resetChapterContext(): void {
    completedChapterKey = null;
    chapterOpenedAt = Date.now();
    lastScrollHeight = 0;
    lastHeightChangeAt = Date.now();
  }

  function check(): void {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetChapterContext();
    }
    const chapter = config.getChapterNumber();
    if (chapter === null) {
      return;
    }
    const root = document.scrollingElement ?? document.documentElement;
    if (root.scrollHeight !== lastScrollHeight) {
      lastScrollHeight = root.scrollHeight;
      lastHeightChangeAt = Date.now();
      return;
    }
    if (Date.now() - chapterOpenedAt < MIN_CHAPTER_VIEW_MS || Date.now() - lastHeightChangeAt < HEIGHT_STABLE_MS) {
      return;
    }
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
        resetChapterContext();
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
