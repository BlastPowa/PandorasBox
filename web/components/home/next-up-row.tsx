"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, PlayCircle } from "lucide-react";
import { useLibrary } from "@/lib/library/use-library";

type NextUpItem = {
  id: string;
  href: string;
  title: string;
  posterUrl: string | null;
  imageUrl: string | null;
  season: number | null;
  episode: number;
  episodeTitle: string | null;
  airDate: string | null;
  runtime: number | null;
};

export function NextUpRow() {
  const { items, signedIn, loading } = useLibrary();
  const [result, setResult] = useState<{ key: string; items: NextUpItem[] }>({ key: "", items: [] });
  const watching = useMemo(
    () => items
      .filter((item) => (item.status === "watching" || item.status === "rewatching") && (item.type === "series" || item.type === "anime"))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        source: item.source,
        type: item.type,
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        tmdbId: item.tmdbId,
        anilistId: item.anilistId,
        malId: item.malId,
        currentSeason: item.progress.currentSeason,
        currentEpisode: item.progress.currentEpisode,
      })),
    [items]
  );
  const requestKey = useMemo(() => JSON.stringify({ items: watching }), [watching]);
  const nextUp = result.key === requestKey ? result.items : [];
  const fetching = signedIn && !loading && watching.length > 0 && result.key !== requestKey;

  useEffect(() => {
    if (!signedIn || loading || watching.length === 0) return;

    const controller = new AbortController();
    void fetch("/api/home/next-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestKey,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Next up request failed");
        const data = await response.json() as { items?: NextUpItem[] };
        setResult({ key: requestKey, items: data.items ?? [] });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key: requestKey, items: [] });
      });

    return () => controller.abort();
  }, [loading, requestKey, signedIn, watching.length]);

  if (!signedIn || loading || watching.length === 0 || (!fetching && nextUp.length === 0)) return null;

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="font-display text-lg font-bold">Next Up</h2>
        <p className="text-xs text-[var(--text-muted)]">The next available unwatched episode in your current shows</p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3">
          {fetching && nextUp.length === 0
            ? Array.from({ length: Math.min(4, watching.length) }).map((_, index) => (
                <div key={index} className="skeleton h-[168px] w-[280px] shrink-0 rounded-[var(--radius-lg)] sm:w-[340px]" />
              ))
            : nextUp.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="glass group relative h-[168px] w-[280px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] sm:w-[340px]"
                >
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="340px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : item.posterUrl ? (
                    <Image src={item.posterUrl} alt="" fill sizes="340px" className="object-cover opacity-45 blur-[1px] transition-transform duration-300 group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/15" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold text-white/75">
                      <PlayCircle className="size-4" />
                      <span>{item.season != null ? `S${item.season} E${item.episode}` : `Episode ${item.episode}`}</span>
                      {item.runtime && <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{item.runtime}m</span>}
                    </div>
                    <h3 className="line-clamp-1 font-display text-base font-bold">{item.title}</h3>
                    <p className="line-clamp-1 text-xs text-white/75">{item.episodeTitle ?? (item.season != null ? `Episode ${item.episode}` : `Episode ${item.episode}`)}</p>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
