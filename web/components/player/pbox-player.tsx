"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import type { PlaybackSource } from "@/lib/playback/types";
import { useLibrary } from "@/lib/library/use-library";
import { readPlayerPreferences, type PlayerPreferences } from "@/lib/playback/preferences";
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
}: {
  itemId: string;
  title: string;
  mediaType: "movie" | "series" | "anime";
  episodeContext?: EpisodePlaybackContext;
  sources: PlaybackSource[];
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
  const [preferences] = useState<PlayerPreferences>(() => readPlayerPreferences());
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

  useEffect(() => {
    failedSourcesRef.current.clear();
    recoveryAttemptsRef.current.clear();
    resumeTimeRef.current = 0;
  }, [sources]);

  const orderedSources = useMemo(() => {
    const order = new Map(preferences.sourceOrder.map((provider, index) => [provider, index]));
    const preferredHeight = preferences.preferredQuality === "auto" ? null : Number.parseInt(preferences.preferredQuality, 10);
    return [...sources].sort((a, b) => {
      const providerA = order.get(a.provider) ?? 99;
      const providerB = order.get(b.provider) ?? 99;
      if (providerA !== providerB) return providerA - providerB;
      if (preferredHeight === null) return 0;
      const heightA = Number.parseInt(a.quality ?? "0", 10);
      const heightB = Number.parseInt(b.quality ?? "0", 10);
      return Math.abs(heightA - preferredHeight) - Math.abs(heightB - preferredHeight);
    });
  }, [preferences.preferredQuality, preferences.sourceOrder, sources]);

  const source = orderedSources[sourceIndex] ?? orderedSources[0];
  const sourceOptions = useMemo(
    () => orderedSources.map((item, index) => ({ index, label: `${item.providerName}${item.quality ? ` · ${item.quality}` : ""}` })),
    [orderedSources]
  );

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
  }, [episodeContext, getById, itemId, mediaType, source.id]);

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
  }, [applyCaptionTrack, captionsEnabled]);

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
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="size-full object-contain"
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
          onEnded={() => { setPlaying(false); completedRef.current = false; void syncProgress(true); }}
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
            {sourceOptions.length > 1 && (
              <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white/75">
                <PBoxMirrorIcon size={17} />
                <select
                  value={sourceIndex}
                  onChange={(event) => {
                    resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
                    setFallbackMessage(null);
                    const nextIndex = Number(event.target.value);
                    const nextSource = orderedSources[nextIndex];
                    if (nextSource) failedSourcesRef.current.delete(nextSource.id);
                    setSourceIndex(nextIndex);
                  }}
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
                <div className="absolute bottom-12 right-0 z-20 w-72 rounded-2xl border border-white/10 bg-[#0a0a0d]/95 p-3 text-left shadow-2xl backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div><p className="text-sm font-bold text-white">Playback settings</p><p className="text-[10px] text-white/45">Changes here last for this player.</p></div>
                    <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">PBox</span>
                  </div>
                  <label className="block text-[11px] font-semibold text-white/55">
                    Mirror / quality
                    <select
                      value={sourceIndex}
                      onChange={(event) => {
                        resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
                        const nextIndex = Number(event.target.value);
                        const nextSource = orderedSources[nextIndex];
                        if (nextSource) failedSourcesRef.current.delete(nextSource.id);
                        setFallbackMessage(null);
                        setSourceIndex(nextIndex);
                      }}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[var(--accent)]"
                    >
                      {sourceOptions.map((option) => <option key={option.index} value={option.index} className="bg-black">{option.label}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setAutoFallback((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs">
                    <span><span className="block font-semibold text-white">Automatic mirror fallback</span><span className="mt-0.5 block text-[10px] text-white/45">Switch source when playback fails.</span></span>
                    <span className={`relative h-5 w-9 rounded-full transition ${autoFallback ? "bg-[var(--accent)]" : "bg-white/15"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white transition ${autoFallback ? "left-[18px]" : "left-0.5"}`} /></span>
                  </button>
                  {source.captions.length > 0 && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Subtitles</span>
                        <button type="button" onClick={toggleCaptions} className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${captionsEnabled ? "bg-white text-black" : "bg-white/10 text-white/55"}`}>{captionsEnabled ? "On" : "Off"}</button>
                      </div>
                      <select
                        value={captionIndex}
                        onChange={(event) => {
                          const nextIndex = Number(event.target.value);
                          setCaptionIndex(nextIndex);
                          setCaptionsEnabled(true);
                          applyCaptionTrack(true, nextIndex);
                        }}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-[11px] font-semibold text-white outline-none"
                        aria-label="Subtitle language"
                      >
                        {source.captions.map((caption, index) => <option key={`${caption.url}-${index}`} value={index}>{caption.label || caption.language}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="mt-3 rounded-xl bg-white/[0.035] px-3 py-2 text-[10px] leading-relaxed text-white/45">
                    Completion is marked at {preferences.completionThreshold}% watched. Persistent defaults are in Settings → Player.
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
