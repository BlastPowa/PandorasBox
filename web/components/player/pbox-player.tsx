"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import {
  AudioLines,
  Cast,
  ChevronRight,
  Cloud,
  Gauge,
  Languages,
  ListVideo,
  Maximize2,
  Monitor,
  Palette,
  PictureInPicture2,
  RectangleHorizontal,
  SkipForward,
  Sparkles,
} from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { useLibrary } from "@/lib/library/use-library";
import { readPlayerPreferences, writePlayerPreferences, type PlayerPreferences } from "@/lib/playback/preferences";
import {
  PBoxBack10Icon,
  PBoxCaptionsIcon,
  PBoxForward10Icon,
  PBoxFullscreenIcon,
  PBoxMirrorIcon,
  PBoxMuteIcon,
  PBoxPauseIcon,
  PBoxPipIcon,
  PBoxPlayIcon,
  PBoxSettingsIcon,
  PBoxVolumeIcon,
} from "./pbox-player-icons";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

type EpisodePlaybackContext = {
  season: number | null;
  episode: number;
  isFinalEpisode?: boolean;
};

export function PBoxPlayer({
  itemId,
  title,
  mediaType,
  episodeContext,
  sources,
  onAutoNext,
  onOpenEpisodes,
}: {
  itemId: string;
  title: string;
  mediaType: "movie" | "series" | "anime";
  episodeContext?: EpisodePlaybackContext;
  sources: PlaybackSource[];
  onAutoNext?: () => void;
  onOpenEpisodes?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const lastSyncRef = useRef(0);
  const completedRef = useRef(false);
  const failedSourcesRef = useRef(new Set<string>());
  const recoveryAttemptsRef = useRef(new Map<string, number>());
  const resumeTimeRef = useRef(0);
  const sourceLoadTimerRef = useRef<number | null>(null);
  const { getById, signedIn, updateProgress, setStatus, markComplete } = useLibrary();
  const [preferences, setPreferences] = useState<PlayerPreferences>(() => readPlayerPreferences());
  const [sourceIndex, setSourceIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(preferences.subtitles !== "off");
  const [captionIndex, setCaptionIndex] = useState(0);
  const [autoFallback, setAutoFallback] = useState(preferences.autoFallback);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const persistPreferences = useCallback((patch: Partial<PlayerPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      writePlayerPreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    failedSourcesRef.current.clear();
    recoveryAttemptsRef.current.clear();
    resumeTimeRef.current = 0;
  }, [sources]);

  const orderedSources = useMemo(() => {
    const order = new Map(preferences.sourceOrder.map((provider, index) => [provider, index]));
    const preferredHeight = preferences.preferredQuality === "auto" ? null : Number.parseInt(preferences.preferredQuality, 10);
    return [...sources].sort((a, b) => {
      if (preferences.dataSaver) {
        const heightA = Number.parseInt(a.quality ?? "0", 10);
        const heightB = Number.parseInt(b.quality ?? "0", 10);
        if (heightA > 0 && heightB > 0 && heightA !== heightB) return heightA - heightB;
        if (heightA > 0 && heightB <= 0) return -1;
        if (heightB > 0 && heightA <= 0) return 1;
      }
      const providerA = order.get(a.provider) ?? 99;
      const providerB = order.get(b.provider) ?? 99;
      if (providerA !== providerB) return providerA - providerB;
      if (preferredHeight === null) return 0;
      const heightA = Number.parseInt(a.quality ?? "0", 10);
      const heightB = Number.parseInt(b.quality ?? "0", 10);
      return Math.abs(heightA - preferredHeight) - Math.abs(heightB - preferredHeight);
    });
  }, [preferences.dataSaver, preferences.preferredQuality, preferences.sourceOrder, sources]);

  const source = orderedSources[sourceIndex] ?? orderedSources[0];
  const sourceOptions = useMemo(
    () => orderedSources.map((item, index) => ({ index, label: `${item.providerName}${item.quality ? ` · ${item.quality}` : ""}` })),
    [orderedSources]
  );
  const qualityOptions = useMemo(
    () => Array.from(new Set(orderedSources.map((item) => item.quality).filter((quality): quality is string => Boolean(quality))))
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)),
    [orderedSources]
  );

  const switchSource = useCallback((nextIndex: number) => {
    resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
    setFallbackMessage(null);
    const nextSource = orderedSources[nextIndex];
    if (nextSource) failedSourcesRef.current.delete(nextSource.id);
    setSourceIndex(nextIndex);
  }, [orderedSources]);

  const fallbackToNextSource = useCallback((reason: string) => {
    const video = videoRef.current;
    if (!source) return;
    if (failedSourcesRef.current.has(source.id)) return;
    failedSourcesRef.current.add(source.id);
    resumeTimeRef.current = video?.currentTime ?? 0;
    if (!autoFallback) {
      setFallbackMessage(`${source.providerName} could not play this title. Pick another mirror.`);
      return;
    }
    const next = orderedSources.findIndex((candidate, index) => index !== sourceIndex && !failedSourcesRef.current.has(candidate.id));
    if (next < 0) {
      setFallbackMessage("All available mirrors failed. Try again later or choose an external watch option.");
      return;
    }
    const nextSource = orderedSources[next]!;
    setFallbackMessage(`${reason} Trying mirror ${next + 1}/${orderedSources.length}: ${nextSource.providerName}${nextSource.quality ? ` ${nextSource.quality}` : ""}…`);
    setSourceIndex(next);
  }, [autoFallback, orderedSources, source, sourceIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (sourceLoadTimerRef.current !== null) window.clearTimeout(sourceLoadTimerRef.current);
    let hls: Hls | null = null;
    let dash: dashjs.MediaPlayerClass | null = null;

    sourceLoadTimerRef.current = window.setTimeout(() => {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) fallbackToNextSource("Mirror timed out.");
    }, 12_000);

    if (source.kind === "hls" && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(source.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const attempts = recoveryAttemptsRef.current.get(source.id) ?? 0;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && attempts === 0) {
          recoveryAttemptsRef.current.set(source.id, 1);
          setFallbackMessage(`Mirror ${sourceIndex + 1}/${orderedSources.length} lost its connection. Reconnecting…`);
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && attempts <= 1) {
          recoveryAttemptsRef.current.set(source.id, attempts + 1);
          setFallbackMessage(`Mirror ${sourceIndex + 1}/${orderedSources.length} hit a playback error. Recovering…`);
          hls?.recoverMediaError();
          return;
        }
        fallbackToNextSource("HLS playback failed.");
      });
    } else if (source.kind === "dash") {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(video, source.url, false);
      dash.on(dashjs.MediaPlayer.events.ERROR, () => fallbackToNextSource("DASH playback failed."));
    } else {
      video.src = source.url;
      video.load();
    }

    return () => {
      hls?.destroy();
      dash?.destroy();
      if (sourceLoadTimerRef.current !== null) window.clearTimeout(sourceLoadTimerRef.current);
      video.removeAttribute("src");
      video.load();
    };
  }, [fallbackToNextSource, orderedSources.length, source, sourceIndex]);

  const syncProgress = useCallback(async (force = false) => {
    const video = videoRef.current;
    if (!video || !signedIn) return;
    const item = getById(itemId);
    if (!item || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const now = Date.now();
    if (!force && now - lastSyncRef.current < 15_000) return;
    lastSyncRef.current = now;
    const percent = Math.max(0, Math.min(100, Math.round((video.currentTime / video.duration) * 100)));

    if (mediaType === "movie") {
      if (percent >= preferences.completionThreshold) {
        if (!completedRef.current && item.status !== "completed") {
          completedRef.current = true;
          await markComplete(itemId);
        }
        return;
      }
      if (item.status === "planned") await setStatus(itemId, "watching");
      await updateProgress(itemId, { movieTimestamp: Math.round(video.currentTime), percentComplete: percent });
      return;
    }

    if ((mediaType === "series" || mediaType === "anime") && episodeContext) {
      const season = episodeContext.season ?? item.progress.currentSeason ?? 1;
      const progress = {
        currentSeason: season,
        currentEpisode: episodeContext.episode,
        episodeTimestamp: percent >= preferences.completionThreshold ? null : Math.round(video.currentTime),
        currentEpisodePercent: percent >= preferences.completionThreshold ? 100 : percent,
        ...(percent >= preferences.completionThreshold
          ? {
              lastCompletedSeason: season,
              lastCompletedEpisode: episodeContext.episode,
              lastCompletedAt: new Date().toISOString(),
            }
          : {}),
      };
      if (item.status === "planned") await setStatus(itemId, "watching");
      await updateProgress(itemId, progress);
      if (percent >= preferences.completionThreshold && episodeContext.isFinalEpisode && item.status !== "completed") {
        await markComplete(itemId);
      }
    }
  }, [episodeContext, getById, itemId, markComplete, mediaType, preferences.completionThreshold, setStatus, signedIn, updateProgress]);

  const handleLoadedMetadata = useCallback((video: HTMLVideoElement) => {
    if (sourceLoadTimerRef.current !== null) window.clearTimeout(sourceLoadTimerRef.current);
    setDuration(video.duration || 0);
    video.playbackRate = preferences.playbackRate;
    if (resumeTimeRef.current > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(resumeTimeRef.current, Math.max(0, video.duration - 0.25));
      resumeTimeRef.current = 0;
    } else {
      const item = getById(itemId);
      if (mediaType === "movie" && item?.type === "movie" && (item.progress.movieTimestamp ?? 0) > 0) {
        video.currentTime = Math.min(item.progress.movieTimestamp!, Math.max(0, video.duration - 0.25));
      } else if (
        episodeContext &&
        item &&
        item.progress.currentEpisode === episodeContext.episode &&
        (episodeContext.season == null || (item.progress.currentSeason ?? 1) === episodeContext.season) &&
        (item.progress.episodeTimestamp ?? 0) > 0
      ) {
        video.currentTime = Math.min(item.progress.episodeTimestamp!, Math.max(0, video.duration - 0.25));
      }
    }
    recoveryAttemptsRef.current.delete(source.id);
    setFallbackMessage(null);
  }, [episodeContext, getById, itemId, mediaType, preferences.playbackRate, source.id]);

  const applyCaptionTrack = useCallback((enabled: boolean, selectedIndex = captionIndex) => {
    const video = videoRef.current;
    if (!video) return;
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index]!.mode = enabled && index === selectedIndex ? "showing" : "disabled";
    }
  }, [captionIndex]);

  const toggleCaptions = useCallback(() => {
    const next = !captionsEnabled;
    applyCaptionTrack(next);
    setCaptionsEnabled(next);
    persistPreferences({ subtitles: next ? "on" : "off" });
  }, [applyCaptionTrack, captionsEnabled, persistPreferences]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const setVideoVolume = (next: number) => {
    const video = videoRef.current;
    if (!video) return;
    const value = Math.max(0, Math.min(1, next));
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const requestPiP = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  };

  const requestFullscreen = async () => {
    const container = playerRef.current;
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen();
  };

  const setPlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    persistPreferences({ playbackRate: rate });
  };

  const toggleDataSaver = () => {
    resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
    persistPreferences({ dataSaver: !preferences.dataSaver });
    setFallbackMessage(null);
    setSourceIndex(0);
  };

  const handleEnded = () => {
    setPlaying(false);
    completedRef.current = false;
    void syncProgress(true).finally(() => {
      if (preferences.autoplayNext && episodeContext && !episodeContext.isFinalEpisode) onAutoNext?.();
    });
  };

  const playerAspectRatio = preferences.aspectRatio === "4:3"
    ? "4 / 3"
    : preferences.aspectRatio === "21:9"
      ? "21 / 9"
      : "16 / 9";
  const videoObjectFit = preferences.displayMode === "fill"
    ? "cover"
    : preferences.displayMode === "stretch"
      ? "fill"
      : "contain";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (event.code === "Space" || key === "k") {
        event.preventDefault();
        void togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      } else if (key === "m") {
        toggleMute();
      } else if (key === "f") {
        void requestFullscreen();
      } else if (key === "c" && source.captions.length > 0) {
        toggleCaptions();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [source.captions.length, toggleCaptions]);

  if (!source) return null;

  return (
    <div ref={playerRef} className="overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-black shadow-2xl">
      <div className="relative bg-black" style={{ aspectRatio: playerAspectRatio }}>
        <video
          ref={videoRef}
          className="size-full"
          style={{ objectFit: videoObjectFit }}
          playsInline
          preload="metadata"
          onClick={() => void togglePlay()}
          onPlay={() => { setPlaying(true); void syncProgress(true); }}
          onPause={() => { setPlaying(false); void syncProgress(true); }}
          onLoadedMetadata={(event) => handleLoadedMetadata(event.currentTarget)}
          onCanPlay={() => {
            if (sourceLoadTimerRef.current !== null) window.clearTimeout(sourceLoadTimerRef.current);
          }}
          onTimeUpdate={(event) => { setCurrentTime(event.currentTarget.currentTime); void syncProgress(false); }}
          onEnded={handleEnded}
          onError={() => fallbackToNextSource("Mirror failed.")}
          onStalled={() => {
            if (videoRef.current && videoRef.current.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
              if (sourceLoadTimerRef.current !== null) window.clearTimeout(sourceLoadTimerRef.current);
              sourceLoadTimerRef.current = window.setTimeout(() => fallbackToNextSource("Mirror stalled."), 8_000);
            }
          }}
          crossOrigin="anonymous"
        >
          {source.captions.map((caption, index) => (
            <track key={caption.url} kind="subtitles" src={caption.url} srcLang={caption.language} label={caption.label} default={index === 0 && preferences.subtitles !== "off"} />
          ))}
        </video>
        {!playing && (
          <button
            type="button"
            onClick={() => void togglePlay()}
            className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:scale-105"
            aria-label="Play"
          >
            <PBoxPlayIcon size={30} />
          </button>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
          <span className="grid size-4 place-items-center rounded-[5px] bg-[var(--accent)] text-[8px] font-black text-black">P</span>
          PBox Player
        </div>
        {fallbackMessage && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-300/20 bg-black/80 px-3 py-2 text-xs text-amber-100 backdrop-blur">
            {fallbackMessage}
          </div>
        )}
      </div>

      <div className="space-y-3 bg-[linear-gradient(180deg,#0b0b0f,#050507)] p-3 text-white sm:p-4">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = Number(event.target.value);
          }}
          className="w-full accent-[var(--accent)]"
          aria-label="Playback position"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void togglePlay()} className="grid size-9 place-items-center rounded-full bg-white text-black" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PBoxPauseIcon size={18} /> : <PBoxPlayIcon size={18} />}
          </button>
          <button type="button" onClick={() => seekBy(-10)} className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Back 10 seconds"><PBoxBack10Icon size={19} /></button>
          <button type="button" onClick={() => seekBy(10)} className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Forward 10 seconds"><PBoxForward10Icon size={19} /></button>
          <button type="button" onClick={toggleMute} className="grid size-9 place-items-center rounded-full bg-white/10" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <PBoxMuteIcon size={19} /> : <PBoxVolumeIcon size={19} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => setVideoVolume(Number(event.target.value))} className="w-20 accent-white" aria-label="Volume" />
          <span className="font-mono text-xs text-white/60">{formatTime(currentTime)} / {formatTime(duration)}</span>

          <div className="ml-auto flex items-center gap-2">
            {episodeContext && onOpenEpisodes && (
              <button
                type="button"
                onClick={onOpenEpisodes}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
                aria-label="Browse episodes"
              >
                <ListVideo className="size-4" />
                <span className="hidden sm:inline">Episodes</span>
              </button>
            )}
            {sourceOptions.length > 1 && (
              <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white/75">
                <PBoxMirrorIcon size={17} />
                <select
                  value={sourceIndex}
                  onChange={(event) => switchSource(Number(event.target.value))}
                  className="max-w-[170px] bg-transparent py-1 text-xs font-semibold text-white outline-none"
                  aria-label="Playback mirror"
                >
                  {sourceOptions.map((option) => <option key={option.index} value={option.index} className="bg-black">{option.label}</option>)}
                </select>
              </label>
            )}
            {source.captions.length > 0 && <button type="button" onClick={toggleCaptions} className={`grid size-9 place-items-center rounded-full ${captionsEnabled ? "bg-white text-black" : "bg-white/10"}`} aria-label="Toggle subtitles"><PBoxCaptionsIcon size={18} /></button>}
            <div className="relative">
              <button type="button" onClick={() => setSettingsOpen((open) => !open)} className={`grid size-9 place-items-center rounded-full transition ${settingsOpen ? "bg-white text-black" : "bg-white/10 hover:bg-white/15"}`} aria-label="Player settings"><PBoxSettingsIcon size={19} /></button>
              {settingsOpen && (
                <div className="absolute bottom-12 right-0 z-30 max-h-[70vh] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-white/10 bg-[#070708]/97 text-left shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl [scrollbar-width:thin]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-white">Player settings</p>
                      <p className="text-[10px] text-white/40">Playback controls for this device</p>
                    </div>
                    <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">PBox</span>
                  </div>

                  <div className="divide-y divide-white/[0.055]">
                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <Gauge className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Quality</span>
                      {qualityOptions.length > 0 ? (
                        <div className="flex items-center gap-1 text-white/45">
                          <select
                            value={source.quality ?? qualityOptions[0]}
                            onChange={(event) => {
                              const nextIndex = orderedSources.findIndex((item) => item.quality === event.target.value);
                              if (nextIndex >= 0) switchSource(nextIndex);
                            }}
                            className="max-w-32 appearance-none bg-transparent text-right text-xs text-white/45 outline-none"
                            aria-label="Playback quality"
                          >
                            {qualityOptions.map((quality) => <option key={quality} value={quality} className="bg-black text-white">{quality}</option>)}
                          </select>
                          <ChevronRight className="size-4" />
                        </div>
                      ) : <span className="text-xs text-white/35">Auto</span>}
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <Cloud className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Server</span>
                      <div className="flex min-w-0 items-center gap-1 text-white/45">
                        <select value={sourceIndex} onChange={(event) => switchSource(Number(event.target.value))} className="max-w-40 appearance-none truncate bg-transparent text-right text-xs text-white/45 outline-none" aria-label="Playback server">
                          {sourceOptions.map((option) => <option key={option.index} value={option.index} className="bg-black text-white">{option.label}</option>)}
                        </select>
                        <ChevronRight className="size-4 shrink-0" />
                      </div>
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <Languages className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Subtitles</span>
                      {source.captions.length > 0 ? (
                        <div className="flex min-w-0 items-center gap-1 text-white/45">
                          <select
                            value={captionsEnabled ? String(captionIndex) : "off"}
                            onChange={(event) => {
                              if (event.target.value === "off") {
                                applyCaptionTrack(false);
                                setCaptionsEnabled(false);
                                persistPreferences({ subtitles: "off" });
                                return;
                              }
                              const nextIndex = Number(event.target.value);
                              setCaptionIndex(nextIndex);
                              setCaptionsEnabled(true);
                              applyCaptionTrack(true, nextIndex);
                              persistPreferences({ subtitles: "on" });
                            }}
                            className="max-w-36 appearance-none truncate bg-transparent text-right text-xs text-white/45 outline-none"
                            aria-label="Subtitle language"
                          >
                            <option value="off" className="bg-black text-white">Off</option>
                            {source.captions.map((caption, index) => <option key={`${caption.url}-${index}`} value={index} className="bg-black text-white">{caption.label || caption.language}</option>)}
                          </select>
                          <ChevronRight className="size-4 shrink-0" />
                        </div>
                      ) : <span className="text-xs text-white/30">None</span>}
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3 opacity-55">
                      <AudioLines className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Audio Track</span>
                      <span className="text-xs text-white/40">Default</span>
                    </div>
                  </div>

                  <div className="border-y border-white/[0.07] bg-white/[0.015] px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/20">Playback</div>

                  <div className="divide-y divide-white/[0.055]">
                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <Gauge className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Speed</span>
                      <div className="flex items-center gap-1 text-white/45">
                        <select value={preferences.playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} className="appearance-none bg-transparent text-right text-xs text-white/45 outline-none" aria-label="Playback speed">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate} className="bg-black text-white">{rate === 1 ? "Normal" : `${rate}x`}</option>)}
                        </select>
                        <ChevronRight className="size-4" />
                      </div>
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <Maximize2 className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Display</span>
                      <div className="flex items-center gap-1 text-white/45">
                        <select value={preferences.displayMode} onChange={(event) => persistPreferences({ displayMode: event.target.value as PlayerPreferences["displayMode"] })} className="appearance-none bg-transparent text-right text-xs capitalize text-white/45 outline-none" aria-label="Display mode">
                          <option value="fit" className="bg-black text-white">Fit</option>
                          <option value="fill" className="bg-black text-white">Fill</option>
                          <option value="stretch" className="bg-black text-white">Stretch</option>
                        </select>
                        <ChevronRight className="size-4" />
                      </div>
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
                      <RectangleHorizontal className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Aspect Ratio</span>
                      <div className="flex items-center gap-1 text-white/45">
                        <select value={preferences.aspectRatio} onChange={(event) => persistPreferences({ aspectRatio: event.target.value as PlayerPreferences["aspectRatio"] })} className="appearance-none bg-transparent text-right text-xs text-white/45 outline-none" aria-label="Aspect ratio">
                          <option value="auto" className="bg-black text-white">Auto</option>
                          <option value="16:9" className="bg-black text-white">16:9</option>
                          <option value="4:3" className="bg-black text-white">4:3</option>
                          <option value="21:9" className="bg-black text-white">21:9</option>
                        </select>
                        <ChevronRight className="size-4" />
                      </div>
                    </div>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3 opacity-55">
                      <Sparkles className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Audio Boost</span>
                      <span className="text-xs text-white/40">100%</span>
                    </div>

                    <button type="button" onClick={() => persistPreferences({ autoplayNext: !preferences.autoplayNext })} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
                      <SkipForward className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Auto Next</span>
                      <span className={`relative h-5 w-9 rounded-full transition ${preferences.autoplayNext ? "bg-[var(--accent)]" : "bg-white/15"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${preferences.autoplayNext ? "left-[18px]" : "left-0.5"}`} /></span>
                    </button>

                    <div className="flex min-h-12 items-center gap-3 px-4 py-3 opacity-45" title="Requires intro and credits timing metadata from the playback source.">
                      <SkipForward className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Auto Skip Intro/Credits</span>
                      <span className="relative h-5 w-9 rounded-full bg-white/15"><span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white" /></span>
                    </div>

                    <button type="button" onClick={toggleDataSaver} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
                      <Cloud className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Data Saver</span>
                      <span className="mr-1 text-xs text-white/35">{preferences.dataSaver ? "On" : "Off"}</span>
                      <span className={`relative h-5 w-9 rounded-full transition ${preferences.dataSaver ? "bg-[var(--accent)]" : "bg-white/15"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${preferences.dataSaver ? "left-[18px]" : "left-0.5"}`} /></span>
                    </button>

                    <button type="button" onClick={() => { const next = !autoFallback; setAutoFallback(next); persistPreferences({ autoFallback: next }); }} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
                      <Monitor className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Auto Fallback</span>
                      <span className={`relative h-5 w-9 rounded-full transition ${autoFallback ? "bg-[var(--accent)]" : "bg-white/15"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${autoFallback ? "left-[18px]" : "left-0.5"}`} /></span>
                    </button>
                  </div>

                  <div className="border-y border-white/[0.07] bg-white/[0.015] px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/20">Appearance</div>

                  <div className="divide-y divide-white/[0.055]">
                    <div className="flex min-h-12 items-center gap-3 px-4 py-3 opacity-65">
                      <Palette className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Player Appearance</span>
                      <span className="text-xs text-white/40">Cinema</span>
                    </div>
                    <button type="button" onClick={() => void requestPiP()} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
                      <PictureInPicture2 className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Picture in Picture</span>
                      <ChevronRight className="size-4 text-white/35" />
                    </button>
                    <div className="flex min-h-12 items-center gap-3 px-4 py-3 opacity-40" title="Casting is not available in this browser player yet.">
                      <Cast className="size-[18px] shrink-0 text-white/50" />
                      <span className="flex-1 text-[13px] font-semibold text-white/90">Cast</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Unavailable</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] leading-relaxed text-white/30">
                    Watched status is marked at {preferences.completionThreshold}% completion.
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={() => void requestPiP()} className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Picture in picture"><PBoxPipIcon size={18} /></button>
            <button type="button" onClick={() => void requestFullscreen()} className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Fullscreen"><PBoxFullscreenIcon size={18} /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-white/55">
          <span className="truncate">{title}{episodeContext ? ` · S${episodeContext.season ?? 1} E${episodeContext.episode}` : ""} · {source.providerName}{source.quality ? ` · ${source.quality}` : ""} · Mirror {sourceIndex + 1}/{orderedSources.length}</span>
          <a href={source.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white/75 hover:text-white">{source.license}</a>
        </div>
      </div>
    </div>
  );
}
