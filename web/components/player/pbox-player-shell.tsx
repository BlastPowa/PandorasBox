"use client";

import { useEffect, useRef, useState } from "react";
import { FileVideo2, PlaySquare, Server, Settings2, ShieldCheck } from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { PBoxPlayer } from "./pbox-player";
import { PlayerQuickSettings } from "./player-quick-settings";

type PlaybackConfiguration = {
  jellyfin: boolean;
  emby: boolean;
  configuredFeed: boolean;
  hasPrivateSource: boolean;
};

export function PBoxPlayerShell({
  itemId,
  title,
  titleAliases = [],
  type,
  year,
  season = null,
  episode = null,
  episodeTitle = null,
  isFinalEpisode = false,
  showUnavailable = false,
  onAutoNext,
  nextLabel,
  onOpenEpisodes,
  onWatchPartyMediaChange,
}: {
  itemId: string;
  title: string;
  titleAliases?: string[];
  type: string;
  year: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  isFinalEpisode?: boolean;
  showUnavailable?: boolean;
  onAutoNext?: () => void;
  nextLabel?: string;
  onOpenEpisodes?: () => void;
  onWatchPartyMediaChange?: (media: { season: number | null; episode: number | null }) => void;
}) {
  const [sources, setSources] = useState<PlaybackSource[] | null>(null);
  const [configuration, setConfiguration] = useState<PlaybackConfiguration | null>(null);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [localSource, setLocalSource] = useState<PlaybackSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (localSource?.url.startsWith("blob:")) URL.revokeObjectURL(localSource.url);
  }, [localSource]);

  useEffect(() => {
    setLocalSource(null);
  }, [episode, itemId, season, type]);

  useEffect(() => {
    if (type !== "movie" && type !== "series" && type !== "anime") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    for (const alias of titleAliases) {
      const value = alias.trim();
      if (value && value.toLowerCase() !== title.toLowerCase()) params.append("alias", value);
    }
    if (year) params.set("year", String(year));
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));
    if (episodeTitle) params.set("episodeTitle", episodeTitle);
    queueMicrotask(() => setSources(null));
    void fetch(`/api/playback/sources?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playback discovery failed");
        const data = await response.json() as { sources?: PlaybackSource[]; configuration?: PlaybackConfiguration };
        setSources(data.sources ?? []);
        setConfiguration(data.configuration ?? null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSources([]);
        setConfiguration(null);
      });
    return () => controller.abort();
  }, [episode, episodeTitle, season, title, titleAliases, type, year]);

  if (type !== "movie" && type !== "series" && type !== "anime") return null;
  if (localSource) {
    return (
      <section id="pbox-player" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlaySquare className="size-5 text-[var(--accent)]" />
          <h2 className="font-display text-xl font-bold">PBox Player</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> Local media</span>
          <span className="max-w-[min(60vw,520px)] truncate text-xs text-[var(--text-muted)]">{localSource.title}</span>
        </div>
        <PBoxPlayer
          key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}:local:${localSource.id}`}
          itemId={itemId}
          title={title}
          mediaType={type as "movie" | "series" | "anime"}
          episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
          sources={[localSource]}
          onAutoNext={onAutoNext}
          nextLabel={nextLabel}
          onOpenEpisodes={onOpenEpisodes}
          onWatchPartyMediaChange={onWatchPartyMediaChange}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07] hover:text-white"
          >
            <FileVideo2 className="size-3.5" /> Change local video
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mkv,.m4v,.mov,.webm,.ogv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setLocalSource((current) => {
              if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
              return {
                id: `local-${file.name}-${file.lastModified}`,
                provider: "local-file",
                providerName: "Local file",
                title: file.name,
                kind: "direct",
                url,
                mimeType: file.type || null,
                quality: null,
                license: "User-selected local media",
                sourcePageUrl: "",
                captions: [],
              };
            });
            event.currentTarget.value = "";
          }}
        />
      </section>
    );
  }
  if (sources !== null && sources.length === 0) {
    if (!showUnavailable) return null;
    const providerMissing = configuration?.hasPrivateSource === false;
    return (
      <section id="pbox-player" className="scroll-mt-24">
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-black/55 px-6 py-14 text-center shadow-2xl backdrop-blur-xl">
          {providerMissing ? <Server className="mx-auto size-9 text-[var(--accent)]" /> : <PlaySquare className="mx-auto size-9 text-[var(--accent)]" />}
          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            {providerMissing ? "Connect a playback source" : "No stream found for this title"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            {providerMissing
              ? `This PBox deployment has no Jellyfin, Emby, or authorised playback feed configured, so ${episode ? "this episode" : "this title"} has nowhere to load video from inside the site.`
              : `A playback source is connected, but ${episode ? "this episode" : "this title"} was not found in it and no matching verified open source was available.`}
          </p>
          <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-110"
            >
              <FileVideo2 className="size-4" /> Open local video
            </button>
            <button
              type="button"
              onClick={() => setQuickSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Settings2 className="size-4" /> Playback settings
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv,.m4v,.mov,.webm,.ogv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setLocalSource({
                id: `local-${file.name}-${file.lastModified}`,
                provider: "local-file",
                providerName: "Local file",
                title: file.name,
                kind: "direct",
                url,
                mimeType: file.type || null,
                quality: null,
                license: "User-selected local media",
                sourcePageUrl: "",
                captions: [],
              });
              event.currentTarget.value = "";
            }}
          />
        </div>
        <PlayerQuickSettings open={quickSettingsOpen} onClose={() => setQuickSettingsOpen(false)} configuration={configuration} />
      </section>
    );
  }
  if (sources === null) {
    return (
      <section id="pbox-player" className="scroll-mt-24 space-y-3">
        <div className="flex items-center gap-2">
          <PlaySquare className="size-5 text-[var(--accent)]" />
          <h2 className="font-display text-xl font-bold">PBox Player</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55"><ShieldCheck className="size-3" /> Checking sources</span>
        </div>
        <div className="skeleton aspect-video w-full rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  const providerNames = Array.from(new Set(sources.map((source) => source.providerName)));
  const hasPrivateSource = sources.some((source) => source.provider === "jellyfin" || source.provider === "emby" || source.provider === "configured-feed");

  return (
    <section id="pbox-player" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PlaySquare className="size-5 text-[var(--accent)]" />
        <h2 className="font-display text-xl font-bold">PBox Player</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> {hasPrivateSource ? "Connected source" : "Verified open source"}</span>
        <span className="text-xs text-[var(--text-muted)]">{providerNames.join(" / ")}</span>
      </div>
      <PBoxPlayer
        key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}`}
        itemId={itemId}
        title={title}
        mediaType={type as "movie" | "series" | "anime"}
        episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
        sources={sources}
        onAutoNext={onAutoNext}
        nextLabel={nextLabel}
        onOpenEpisodes={onOpenEpisodes}
        onWatchPartyMediaChange={onWatchPartyMediaChange}
      />
    </section>
  );
}
