import type { ProgressEvent } from "../../../core/storage/progressManager";

export interface VideoTrackerConfig {
  site: string;
  getTitle: () => string;
  getEpisodeNumber: () => number | null;
  getSeasonNumber: () => number | null;
  getTmdbId?: () => number | null;
  getMediaType?: () => "movie" | "tv" | null;
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
  const trackedVideos = new Set<HTMLVideoElement>();
  const videoState = new WeakMap<HTMLVideoElement, {
    contextKey: string;
    completionSentForSrc: string | null;
    lastSentVideoTime: number;
    lastSentAt: number;
  }>();
  let activeVideo: HTMLVideoElement | null = null;
  let intervalId: number | null = null;
  let contextIntervalId: number | null = null;
  let observer: MutationObserver | null = null;
  let refreshQueued = false;

  function buildEvent(video: HTMLVideoElement, percent: number): ProgressEvent {
    return {
      itemId: null,
      site: config.site,
      url: window.location.href,
      title: config.getTitle(),
      tmdbId: config.getTmdbId?.() ?? null,
      mediaType: config.getMediaType?.() ?? null,
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

  function stateFor(video: HTMLVideoElement) {
    let state = videoState.get(video);
    if (!state) {
      state = {
        contextKey: "",
        completionSentForSrc: null,
        lastSentVideoTime: -Infinity,
        lastSentAt: 0,
      };
      videoState.set(video, state);
    }
    return state;
  }

  function resetContext(video: HTMLVideoElement): void {
    const state = stateFor(video);
    const nextKey = getContextKey(video);
    if (nextKey === state.contextKey) {
      return;
    }
    state.contextKey = nextKey;
    state.completionSentForSrc = null;
    state.lastSentVideoTime = -Infinity;
    state.lastSentAt = 0;
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
    activeVideo = video;
    const state = stateFor(video);

    const percent = (video.currentTime / video.duration) * 100;
    const srcKey = `${state.contextKey}|${video.currentSrc}`;
    if (percent >= COMPLETION_PERCENT) {
      if (state.completionSentForSrc === srcKey) {
        return;
      }
      state.completionSentForSrc = srcKey;
      state.lastSentVideoTime = video.currentTime;
      state.lastSentAt = Date.now();
      sendProgress(buildEvent(video, percent));
      return;
    }

    if (video.currentTime <= 10) {
      return;
    }
    if (!force) {
      const movedEnough = Math.abs(video.currentTime - state.lastSentVideoTime) >= MIN_PROGRESS_DELTA_SECONDS;
      const intervalElapsed = Date.now() - state.lastSentAt >= SAVE_INTERVAL_MS;
      if (!movedEnough || !intervalElapsed) {
        return;
      }
    }

    state.lastSentVideoTime = video.currentTime;
    state.lastSentAt = Date.now();
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
    if (trackedVideos.has(video)) {
      resetContext(video);
      return;
    }
    trackedVideos.add(video);
    resetContext(video);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
  }

  function detach(video: HTMLVideoElement): void {
    trackedVideos.delete(video);
    video.removeEventListener("timeupdate", onTimeUpdate);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("ended", onEnded);
    video.removeEventListener("loadedmetadata", onLoadedMetadata);
    if (activeVideo === video) activeVideo = null;
  }

  function videoScore(video: HTMLVideoElement): number {
    if (!canTrack(video)) return -Infinity;
    const rect = video.getBoundingClientRect();
    const area = Math.max(0, rect.width) * Math.max(0, rect.height);
    const playbackWeight = !video.paused && !video.ended ? 1_000_000_000 : 0;
    const pipWeight = document.pictureInPictureElement === video ? 2_000_000_000 : 0;
    return pipWeight + playbackWeight + area + Math.min(video.currentTime, 86_400);
  }

  function refreshVideos(): HTMLVideoElement | null {
    const current = new Set(document.querySelectorAll<HTMLVideoElement>("video"));
    for (const video of current) attach(video);
    for (const video of [...trackedVideos]) {
      if (!video.isConnected || !current.has(video)) detach(video);
    }

    const best = [...trackedVideos]
      .map((video) => ({ video, score: videoScore(video) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score)[0]?.video ?? null;
    if (best) activeVideo = best;
    return best;
  }

  function scheduleRefresh(): void {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      refreshVideos();
    });
  }

  function tick(): void {
    const video = refreshVideos();
    if (!video || video.paused) {
      return;
    }
    emitProgress(video);
  }

  function flushCurrentVideo(): void {
    const video = activeVideo ?? refreshVideos();
    if (video && !video.ended) {
      emitProgress(video, true);
    }
  }

  function start(): void {
    if (intervalId !== null) {
      return;
    }
    refreshVideos();
    intervalId = window.setInterval(tick, SAVE_INTERVAL_MS);
    contextIntervalId = window.setInterval(refreshVideos, 1000);
    observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        flushCurrentVideo();
      } else {
        refreshVideos();
      }
    });
    window.addEventListener("pagehide", flushCurrentVideo);
    window.addEventListener("popstate", refreshVideos);
    window.addEventListener("hashchange", refreshVideos);
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
