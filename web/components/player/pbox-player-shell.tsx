"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Play, PlaySquare, ShieldCheck, X } from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { PBoxPlayer } from "./pbox-player";

const PLAYER_TEST_SOURCE: PlaybackSource = {
  id: "pbox-player-test-cc0",
  provider: "configured-feed",
  providerName: "Pandora's Box Player Test",
  title: "CC0 Player Test Clip",
  kind: "direct",
  url: "/demo/pbox-player-test.mp4",
  mimeType: "video/mp4",
  quality: "Demo",
  license: "CC0 demo media",
  sourcePageUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  captions: [
    {
      label: "English (test)",
      language: "en",
      url: "/demo/pbox-player-test.vtt",
    },
  ],
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
  onOpenEpisodes?: () => void;
  onWatchPartyMediaChange?: (media: { season: number | null; episode: number | null }) => void;
}) {
  const [sources, setSources] = useState<PlaybackSource[] | null>(null);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    if (type !== "movie" && type !== "series" && type !== "anime") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    if (year) params.set("year", String(year));
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));
    if (episodeTitle) params.set("episodeTitle", episodeTitle);
    queueMicrotask(() => setSources(null));
    queueMicrotask(() => setTestMode(false));
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
    if (testMode) {
      return (
        <section id="pbox-player" className="scroll-mt-24 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FlaskConical className="size-5 text-[var(--accent)]" />
            <h2 className="font-display text-xl font-bold">PBox Player Test</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">Demo media</span>
            <span className="text-xs text-[var(--text-muted)]">Testing {title}{episode ? ` · S${season ?? 1} E${episode}` : ""}</span>
            <button
              type="button"
              onClick={() => setTestMode(false)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" /> Exit test
            </button>
          </div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs leading-relaxed text-amber-100/75">
            This runs the real Pandora&apos;s Box player with bundled CC0 demo media. It tests playback, seeking, progress tracking, fullscreen, settings and subtitles; it is not the selected film or episode.
          </div>
          <PBoxPlayer
            key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}:test`}
            itemId={`__pbox-player-test__:${itemId}`}
            title={`${title} · Player Test`}
            mediaType={type as "movie" | "series" | "anime"}
            episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
            sources={[PLAYER_TEST_SOURCE]}
            onAutoNext={onAutoNext}
            onOpenEpisodes={onOpenEpisodes}
            onWatchPartyMediaChange={onWatchPartyMediaChange}
          />
        </section>
      );
    }
    if (!showUnavailable) return null;
    return (
      <section id="pbox-player" className="scroll-mt-24">
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-black/55 px-6 py-14 text-center shadow-2xl backdrop-blur-xl">
          <PlaySquare className="mx-auto size-9 text-[var(--accent)]" />
          <h2 className="mt-4 font-display text-2xl font-bold text-white">No verified stream available yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            Pandora&apos;s Box could not find a playable verified open source for {episode ? `this episode` : `this title`} yet. You can pick another episode or use the providers on the title page.
          </p>
          <button
            type="button"
            onClick={() => setTestMode(true)}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-110"
          >
            <Play className="size-4 fill-current" /> Test PBox player
          </button>
          <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-white/35">
            Uses bundled CC0 demo media so you can test the full player without treating the demo as {episode ? "this episode" : "this title"}.
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
        key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}`}
        itemId={itemId}
        title={title}
        mediaType={type as "movie" | "series" | "anime"}
        episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
        sources={sources}
        onAutoNext={onAutoNext}
        onOpenEpisodes={onOpenEpisodes}
        onWatchPartyMediaChange={onWatchPartyMediaChange}
      />
    </section>
  );
}
