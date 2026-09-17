"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronUp, LoaderCircle, Play } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { TypeBadge } from "@/components/ui-fx/badge";
import { cn } from "@/lib/utils";
import { mediaItemHref } from "@/lib/library/item-href";

export function PosterCard({
  item,
  className,
  style,
  quickLook = false,
}: {
  item: UnifiedSearchResult;
  className?: string;
  style?: React.CSSProperties;
  quickLook?: boolean;
}) {
  const href = mediaItemHref(item);
  const showQuickLook = quickLook || item.type === "movie" || item.type === "series";
  const trailerCapable = (item.type === "movie" || item.type === "series") && item.source === "tmdb";
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerUnavailable, setTrailerUnavailable] = useState(false);

  async function toggleTrailer() {
    if (trailerOpen) {
      setTrailerOpen(false);
      return;
    }
    setTrailerOpen(true);
    if (trailerKey || trailerUnavailable || trailerLoading || !trailerCapable) return;

    const trailerId = item.tmdbId ?? item.id;
    setTrailerLoading(true);
    try {
      const params = new URLSearchParams({
        type: item.type,
        source: item.source,
        id: String(trailerId),
      });
      const response = await fetch(`/api/trailer?${params.toString()}`);
      const payload = (await response.json()) as { key?: string | null };
      if (payload.key) setTrailerKey(payload.key);
      else setTrailerUnavailable(true);
    } catch {
      setTrailerUnavailable(true);
    } finally {
      setTrailerLoading(false);
    }
  }

  return (
    <div
      style={style}
      className={cn(
        "group pb-card-3d relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]",
        className
      )}
    >
      <Link href={href} aria-label={`View details for ${item.title}`} className="block">
        <div className="relative aspect-[2/3] w-full">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 40vw, 180px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
              {item.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.95),rgba(10,10,15,0.1)_45%,transparent)]" />
          <div className="absolute left-2 top-2">
            <TypeBadge type={item.type} />
          </div>
          {item.score !== null && (
            <div className="absolute right-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--gold)] backdrop-blur">
              ★ {item.score.toFixed(1)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">
              {item.title}
            </h3>
            {item.year !== null && (
              <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">
                {item.year}
              </span>
            )}
          </div>
        </div>
      </Link>

      {showQuickLook && (
        <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_top,rgba(7,8,13,.99)_8%,rgba(7,8,13,.94)_50%,rgba(7,8,13,.45)_78%,transparent)] p-3 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100 sm:flex sm:flex-col sm:justify-end">
          <div className="translate-y-2 transition duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0">
            {trailerOpen && trailerCapable && (
              <div className="pointer-events-auto mb-2 overflow-hidden rounded-lg border border-white/15 bg-black/80 shadow-lg">
                <div className="aspect-video w-full">
                  {trailerLoading ? (
                    <div className="grid size-full place-items-center text-white/70">
                      <LoaderCircle className="size-4 animate-spin" />
                    </div>
                  ) : trailerKey ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1&rel=0`}
                      title={`${item.title} trailer`}
                      className="size-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="grid size-full place-items-center px-2 text-center text-[9px] font-semibold text-white/65">
                      Trailer unavailable
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
              {item.year && <span>{item.year}</span>}
              {item.score !== null && <span className="text-[var(--gold)]">★ {item.score.toFixed(1)}</span>}
            </div>
            <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">{item.title}</h3>
            {!trailerOpen && item.synopsis && <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-white/72">{item.synopsis}</p>}
            <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-2">
              <Link href={href} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/12 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md transition hover:bg-white/20">
                Quick look <ArrowUpRight className="size-3" />
              </Link>
              {trailerCapable && (
                <button
                  type="button"
                  onClick={() => void toggleTrailer()}
                  aria-expanded={trailerOpen}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-black/55"
                >
                  {trailerOpen ? <ChevronUp className="size-3" /> : <Play className="size-3 fill-current" />}
                  {trailerOpen ? "Hide trailer" : "Trailer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
