"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlaySquare, Server, Settings2, ShieldCheck } from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { PBoxPlayer } from "./pbox-player";

type PlaybackConfiguration = {
  jellyfin: boolean;
  emby: boolean;
  configuredFeed: boolean;
  hasPrivateSource: boolean;
};

export function PBoxPlayerShell({
  itemId,
  title,
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

  useEffect(() => {
    if (type !== "movie" && type !== "series" && type !== "anime") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
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
  }, [episode, episodeTitle, season, title, type, year]);

  if (type !== "movie" && type !== "series" && type !== "anime") return null;
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
          <Link
            href="/settings#player"
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-110"
          >
            <Settings2 className="size-4" /> Playback settings
          </Link>
        </div>
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
