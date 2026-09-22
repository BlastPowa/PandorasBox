"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerUnavailable, setTrailerUnavailable] = useState(false);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  function cancelClose() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openPreview() {
    if (!showQuickLook || !cardRef.current) return;
    cancelClose();
    const rect = cardRef.current.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
    setHovered(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setHovered(false);
      setTrailerOpen(false);
    }, 160);
  }

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
      const params = new URLSearchParams({ type: item.type, source: item.source, id: String(trailerId) });
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

  const popupPosition = hovered && anchorRect && typeof window !== "undefined"
    ? (() => {
        const width = 380;
        const gap = 14;
        const rightSide = anchorRect.right + gap;
        const left = rightSide + width <= window.innerWidth - 16
          ? rightSide
          : Math.max(16, anchorRect.left - width - gap);
        return {
          top: Math.max(16, Math.min(anchorRect.top - 40, window.innerHeight - 500)),
          left,
        };
      })()
    : null;

  const artwork = item.backdropUrl ?? item.posterUrl;

  return (
    <>
      <div
        ref={cardRef}
        style={style}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onFocusCapture={openPreview}
        onBlurCapture={scheduleClose}
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
            <div className="absolute left-2 top-2"><TypeBadge type={item.type} /></div>
            {item.score !== null && (
              <div className="absolute right-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--gold)] backdrop-blur">
                ★ {item.score.toFixed(1)}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{item.title}</h3>
              {item.year !== null && <span className="mt-0.5 block font-mono text-[10px] text-white/55">{item.year}</span>}
            </div>
          </div>
        </Link>
      </div>

      {showQuickLook && hovered && popupPosition && typeof document !== "undefined" && createPortal(
        <aside
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="fixed z-[80] hidden w-[380px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_96%,transparent)] p-3 shadow-[0_30px_90px_rgba(0,0,0,.30)] backdrop-blur-2xl md:block motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
          style={popupPosition}
          aria-label={`Quick look at ${item.title}`}
        >
          <div className="relative aspect-video overflow-hidden rounded-[18px] bg-black">
            {trailerOpen && trailerCapable ? (
              trailerLoading ? (
                <div className="grid size-full place-items-center text-white/70"><LoaderCircle className="size-5 animate-spin" /></div>
              ) : trailerKey ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1&rel=0`}
                  title={`${item.title} trailer`}
                  className="size-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="grid size-full place-items-center text-xs font-semibold text-white/60">Trailer unavailable</div>
              )
            ) : artwork ? (
              <Image src={artwork} alt="" fill sizes="380px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center font-display text-4xl font-bold text-white/35">{item.title.charAt(0)}</div>
            )}
            {!trailerOpen && <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,5,8,.82),transparent_58%)]" />}
            {!trailerOpen && (
              <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-white">
                <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/60">{item.type === "series" ? "TV series" : item.type}</p><p className="truncate text-base font-extrabold">{item.title}</p></div>
                {item.score !== null && <span className="shrink-0 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[10px] font-bold">★ {item.score.toFixed(1)}</span>}
              </div>
            )}
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <TypeBadge type={item.type} />
              {item.year !== null && <span>{item.year}</span>}
            </div>
            {item.synopsis && <p className="line-clamp-4 text-xs leading-5 text-[var(--text-secondary)]">{item.synopsis}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Link href={href} className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold text-white">
                Quick look <ArrowUpRight className="size-3.5" />
              </Link>
              {trailerCapable ? (
                <button
                  type="button"
                  onClick={() => void toggleTrailer()}
                  aria-expanded={trailerOpen}
                  className="pb-uiverse-button pb-uiverse-button--glass inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold text-[var(--text-secondary)]"
                >
                  {trailerOpen ? <ChevronUp className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
                  {trailerOpen ? "Hide trailer" : "Play trailer"}
                </button>
              ) : <span />}
            </div>
          </div>
        </aside>,
        document.body,
      )}
    </>
  );
}
