import type { ProgressEvent } from "../../../core/storage/progressManager";

export interface VideoTrackerConfig {
  site: string;
  getTitle: () => string;
  getEpisodeNumber: () => number | null;
  getSeasonNumber: () => number | null;
  minDurationSeconds?: number;
}

const SAVE_INTERVAL_MS = 10000;
const COMPLETION_PERCENT = 92;

function sendProgress(event: ProgressEvent): void {
  try {
    chrome.runtime.sendMessage({ type: "saveProgress", event }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    return;
  }
}

export function setupVideoTracking(config: VideoTrackerConfig): void {
  const minDuration = config.minDurationSeconds ?? 0;
  let trackedVideo: HTMLVideoElement | null = null;
  let completionSentForSrc: string | null = null;
  let intervalId: number | null = null;

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

  function onTimeUpdate(this: HTMLVideoElement): void {
    const video = this;
    if (!Number.isFinite(video.duration) || video.duration < minDuration) {
      return;
    }
    const percent = (video.currentTime / video.duration) * 100;
    const srcKey = `${video.currentSrc}|${config.getEpisodeNumber() ?? ""}`;
    if (percent > COMPLETION_PERCENT && completionSentForSrc !== srcKey) {
      completionSentForSrc = srcKey;
      sendProgress(buildEvent(video, percent));
    }
  }

  function attach(video: HTMLVideoElement): void {
    if (trackedVideo === video) {
      return;
    }
    if (trackedVideo) {
      trackedVideo.removeEventListener("timeupdate", onTimeUpdate);
    }
    trackedVideo = video;
    completionSentForSrc = null;
    video.addEventListener("timeupdate", onTimeUpdate);
  }

  function tick(): void {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video) {
      return;
    }
    attach(video);
    if (video.paused || video.currentTime <= 10) {
      return;
    }
    if (!Number.isFinite(video.duration) || video.duration < minDuration) {
      return;
    }
    const percent = (video.currentTime / video.duration) * 100;
    if (percent > COMPLETION_PERCENT) {
      return;
    }
    sendProgress(buildEvent(video, percent));
  }

  function start(): void {
    if (intervalId !== null) {
      return;
    }
    intervalId = window.setInterval(tick, SAVE_INTERVAL_MS);
    const observer = new MutationObserver(() => {
      const video = document.querySelector<HTMLVideoElement>("video");
      if (video && video !== trackedVideo) {
        attach(video);
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
