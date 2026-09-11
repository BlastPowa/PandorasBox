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
}: {
  itemId: string;
  title: string;
  type: string;
  year: number | null;
}) {
  const [sources, setSources] = useState<PlaybackSource[] | null>(null);

  useEffect(() => {
    if (type !== "movie") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    if (year) params.set("year", String(year));
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
  }, [title, type, year]);

  if (type !== "movie" || (sources !== null && sources.length === 0)) return null;
  if (sources === null) {
    return (
      <section className="space-y-3">
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PlaySquare className="size-5 text-[var(--accent)]" />
        <h2 className="font-display text-xl font-bold">PBox Player</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> Open sources</span>
        <span className="text-xs text-[var(--text-muted)]">Wikimedia Commons / Internet Archive / PeerTube</span>
      </div>
      <PBoxPlayer itemId={itemId} title={title} mediaType="movie" sources={sources} />
    </section>
  );
}
