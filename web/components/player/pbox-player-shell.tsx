"use client";

import { useEffect, useState } from "react";
import { PlaySquare, ShieldCheck } from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { PBoxPlayer } from "./pbox-player";

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
}) {
  const [sources, setSources] = useState<PlaybackSource[] | null>(null);

  useEffect(() => {
    if (type !== "movie" && type !== "series" && type !== "anime") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    if (year) params.set("year", String(year));
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));
    if (episodeTitle) params.set("episodeTitle", episodeTitle);
    setSources(null);
    void fetch(`/api/playback/sources?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playback discovery failed");
        const data = await response.json() as { sources?: PlaybackSource[] };
        setSources(data.sources ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSources([]);
      });
    return () => controller.abort();
  }, [episode, episodeTitle, season, title, type, year]);

  if (type !== "movie" && type !== "series" && type !== "anime") return null;
  if (sources !== null && sources.length === 0) {
    if (!showUnavailable) return null;
    return (
      <section id="pbox-player" className="scroll-mt-24">
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-black/55 px-6 py-14 text-center shadow-2xl backdrop-blur-xl">
          <PlaySquare className="mx-auto size-9 text-[var(--accent)]" />
          <h2 className="mt-4 font-display text-2xl font-bold text-white">No verified stream available yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            Pandora&apos;s Box could not find a playable verified open source for {episode ? `this episode` : `this title`} yet. You can pick another episode or use the providers on the title page.
          </p>
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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> Open sources</span>
        </div>
        <div className="skeleton aspect-video w-full rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  return (
    <section id="pbox-player" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PlaySquare className="size-5 text-[var(--accent)]" />
        <h2 className="font-display text-xl font-bold">PBox Player</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> Open sources</span>
        <span className="text-xs text-[var(--text-muted)]">Wikimedia Commons / Internet Archive / PeerTube</span>
      </div>
      <PBoxPlayer
        itemId={itemId}
        title={title}
        mediaType={type as "movie" | "series" | "anime"}
        episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
        sources={sources}
      />
    </section>
  );
}
