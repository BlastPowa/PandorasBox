import type { ProgressEvent } from "../../../core/storage/progressManager";

export interface VideoTrackerConfig {
  site: string;
  getTitle: () => string;
  getEpisodeNumber: () => number | null;
  getSeasonNumber: () => number | null;
  minDurationSeconds?: number;
  shouldTrack?: (video: HTMLVideoElement) => boolean;
}

const SAVE_INTERVAL_MS = 10000;
const COMPLETION_PERCENT = 92;
const RETRY_DELAY_MS = 900;
const MAX_SEND_ATTEMPTS = 2;
const MIN_PROGRESS_DELTA_SECONDS = 4;

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

export function setupVideoTracking(config: VideoTrackerConfig): void {
  const minDuration = config.minDurationSeconds ?? 0;
  let trackedVideo: HTMLVideoElement | null = null;
  let completionSentForSrc: string | null = null;
  let intervalId: number | null = null;
  let contextIntervalId: number | null = null;
  let observer: MutationObserver | null = null;
  let lastContextKey = "";
  let lastSentVideoTime = -Infinity;
  let lastSentAt = 0;

  function buildEvent(video: HTMLVideoElement, percent: number): ProgressEvent {
    return {
      itemId: null,
      site: config.site,
      url: window.location.href,
      title: config.getTitle(),
      episodeNumber: config.getEpisodeNumber(),
      seasonNumber: config.getSeasonNumber(),
      chapterNumber: null,
      timestamp: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      percentComplete: percent,
    };
  }

  function getContextKey(video: HTMLVideoElement): string {
    return [
      window.location.href,
      video.currentSrc,
      config.getTitle(),
      config.getSeasonNumber() ?? "",
      config.getEpisodeNumber() ?? "",
    ].join("|");
  }

  function resetContext(video: HTMLVideoElement): void {
    const nextKey = getContextKey(video);
    if (nextKey === lastContextKey) {
      return;
    }
    lastContextKey = nextKey;
    completionSentForSrc = null;
    lastSentVideoTime = -Infinity;
    lastSentAt = 0;
  }

  function canTrack(video: HTMLVideoElement): boolean {
    return Number.isFinite(video.duration)
      && video.duration >= minDuration
      && video.currentTime > 0
      && (config.shouldTrack?.(video) ?? true);
  }

  function emitProgress(video: HTMLVideoElement, force = false): void {
    if (!canTrack(video)) {
      return;
    }
    resetContext(video);

    const percent = (video.currentTime / video.duration) * 100;
    const srcKey = `${lastContextKey}|${video.currentSrc}`;
    if (percent >= COMPLETION_PERCENT) {
      if (completionSentForSrc === srcKey) {
        return;
      }
      completionSentForSrc = srcKey;
      lastSentVideoTime = video.currentTime;
      lastSentAt = Date.now();
      sendProgress(buildEvent(video, percent));
      return;
    }

    if (video.currentTime <= 10) {
      return;
    }
    if (!force) {
      const movedEnough = Math.abs(video.currentTime - lastSentVideoTime) >= MIN_PROGRESS_DELTA_SECONDS;
      const intervalElapsed = Date.now() - lastSentAt >= SAVE_INTERVAL_MS;
      if (!movedEnough || !intervalElapsed) {
        return;
      }
    }

    lastSentVideoTime = video.currentTime;
    lastSentAt = Date.now();
    sendProgress(buildEvent(video, percent));
  }

  function onTimeUpdate(this: HTMLVideoElement): void {
    emitProgress(this);
  }

  function onPause(this: HTMLVideoElement): void {
    emitProgress(this, true);
  }

  function onEnded(this: HTMLVideoElement): void {
    emitProgress(this, true);
  }

  function onLoadedMetadata(this: HTMLVideoElement): void {
    resetContext(this);
  }

  function attach(video: HTMLVideoElement): void {
    if (trackedVideo === video) {
      resetContext(video);
      return;
    }
    if (trackedVideo) {
      trackedVideo.removeEventListener("timeupdate", onTimeUpdate);
      trackedVideo.removeEventListener("pause", onPause);
      trackedVideo.removeEventListener("ended", onEnded);
      trackedVideo.removeEventListener("loadedmetadata", onLoadedMetadata);
    }
    trackedVideo = video;
    lastContextKey = "";
    resetContext(video);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
  }

  function refreshVideo(): HTMLVideoElement | null {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video) {
      return null;
    }
    attach(video);
    resetContext(video);
    return video;
  }

  function tick(): void {
    const video = refreshVideo();
    if (!video || video.paused) {
      return;
    }
    emitProgress(video);
  }

  function flushCurrentVideo(): void {
    if (trackedVideo && !trackedVideo.ended) {
      emitProgress(trackedVideo, true);
    }
  }

  function start(): void {
    if (intervalId !== null) {
      return;
    }
    refreshVideo();
    intervalId = window.setInterval(tick, SAVE_INTERVAL_MS);
    contextIntervalId = window.setInterval(refreshVideo, 1000);
    observer = new MutationObserver(refreshVideo);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        flushCurrentVideo();
      } else {
        refreshVideo();
      }
    });
    window.addEventListener("pagehide", flushCurrentVideo);
    window.addEventListener("popstate", refreshVideo);
    window.addEventListener("hashchange", refreshVideo);
  }

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}

export function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] !== undefined) {
      const value = Number.parseFloat(match[1]);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }
  return null;
}
