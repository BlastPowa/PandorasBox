"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ShortItem } from "@/lib/trailers";
import { truncateText } from "@core/utils/formatters";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** Sends a command to a YouTube iframe via its postMessage JS API. */
function ytCommand(iframe: HTMLIFrameElement | null, func: "playVideo" | "pauseVideo") {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "https://www.youtube-nocookie.com"
  );
}

/**
 * TikTok / YouTube-Shorts-style vertical trailer feed. One full-viewport slide
 * per trailer with scroll-snap; only the active slide (+ neighbours) mounts a
 * YouTube player. Right-hand rail mirrors the reference layout: poster, title,
 * View Details, and an audio toggle — no library controls.
 */
export function ShortsFeed({ items }: { items: ShortItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) {
              setActive(idx);
              setPaused(false); // a freshly-scrolled-to trailer always plays
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  const scrollToSlide = useCallback((idx: number) => {
    slideRefs.current[idx]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

  const togglePlay = useCallback(() => {
    const iframe = iframeRefs.current[active];
    setPaused((p) => {
      ytCommand(iframe, p ? "playVideo" : "pauseVideo");
      return !p;
    });
  }, [active]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToSlide(Math.min(active + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToSlide(Math.max(active - 1, 0));
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length, scrollToSlide, togglePlay]);

  if (items.length === 0) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 py-16 text-center">
        <div className="max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--glass)] p-8 shadow-xl backdrop-blur-xl">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]">
            <Sparkles className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text)]">Trailer feed is reloading</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            There are no playable trending trailers in the feed right now. Browse titles while the next set becomes available.
          </p>
          <Link
            href="/browse"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Browse titles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-2px)] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-[var(--bg-base)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/10 bg-black/35 px-3.5 py-2 text-white shadow-lg backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.15em] text-white/90">Trailer feed</p>
              <p className="hidden truncate text-[11px] text-white/55 sm:block">Trending movies and series, one trailer at a time</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold tabular-nums text-white/80">
            <span>{active + 1}</span>
            <span className="text-white/35">/</span>
            <span>{items.length}</span>
          </div>
        </div>
        <div className="mx-auto mt-2 h-1 max-w-5xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/75 transition-[width] duration-300"
            style={{ width: `${((active + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {items.map((s, i) => {
        const isActive = i === active;
        const near = Math.abs(i - active) <= 1;
        const href = `/title/${s.type}/${s.source}/${s.refId}`;
        return (
          <section
            key={s.id}
            data-index={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="relative flex h-full w-full snap-start snap-always items-center justify-center gap-4 px-3 sm:gap-8"
          >
            {/* Keep the cinematic artwork atmosphere around the trailer card
                without a viewport-sized blur repaint on every slide. */}
            {s.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.posterUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-20 saturate-75" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[var(--cinematic-scrim)] opacity-80" />

            {/* Portrait player card — the trailer is letterboxed inside a tall
                rounded card, title/meta pinned to its bottom, rail outside it.
                Sized responsively: near-square-tall on desktop, full-width on
                phones so the player fills the screen like a real short. */}
            <div className="relative z-10 h-full max-h-[94dvh] w-full max-w-[min(94vw,460px)] overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-black/45 shadow-2xl backdrop-blur-sm">
              {/* Poster fills the card's letterbox area while staying cheap to composite. */}
              {s.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.posterUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-18 saturate-75" />
              )}

              {/* Video, centered 16:9 (click to play/pause) */}
              <button
                onClick={togglePlay}
                aria-label={paused ? "Play" : "Pause"}
                className="group absolute inset-x-0 top-1/2 z-10 flex aspect-video w-full -translate-y-1/2 items-center justify-center"
              >
                {near ? (
                  <iframe
                    key={`${s.trailerKey}-${isActive}-${muted}`}
                    ref={(el) => {
                      iframeRefs.current[i] = el;
                    }}
                    src={`https://www.youtube-nocookie.com/embed/${s.trailerKey}?enablejsapi=1&autoplay=${isActive ? 1 : 0}&mute=${muted ? 1 : 0}&controls=0&rel=0&playsinline=1&modestbranding=1&loop=1&playlist=${s.trailerKey}`}
                    title={s.title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    className="pointer-events-none size-full"
                  />
                ) : (
                  s.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.posterUrl} alt={s.title} className="size-full object-contain" />
                  )
                )}

                {isActive && (
                  <span
                    className={cn(
                      "absolute grid size-16 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-opacity",
                      paused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {paused ? <Play className="size-7 fill-current" /> : <Pause className="size-7 fill-current" />}
                  </span>
                )}
              </button>

              {/* Title / year / rating / summary — bottom of the card */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 space-y-1.5 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.58)_60%,transparent)] p-5 pb-24 pt-16 sm:pb-20 md:pb-5">
                <div className="flex items-center gap-3 text-xs font-medium text-white/75">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 uppercase tracking-wide">{s.type}</span>
                  {s.year !== null && <span>{s.year}</span>}
                  {s.score !== null && <span className="text-[var(--gold)]">★ {s.score.toFixed(1)}</span>}
                </div>
                <h2 className="font-display text-2xl font-extrabold leading-tight text-white drop-shadow-lg">{s.title}</h2>
                {s.synopsis && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-white/80">{truncateText(s.synopsis, 150)}</p>
                )}
              </div>
            </div>

            {/* Action rail — overlays the card on phones (so the player stays
                full-width like a real short) and sits outside it on desktop. */}
            <div className="absolute bottom-24 right-3 z-20 flex shrink-0 flex-col items-center gap-3 md:static md:bottom-auto md:right-auto md:z-10 md:gap-4 md:pb-0">
              <Link href={href} className="relative block h-24 w-16 overflow-hidden rounded-[var(--radius-md)] border border-white/20 shadow-lg transition hover:scale-105">
                {s.posterUrl ? (
                  <Image src={s.posterUrl} alt={s.title} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center bg-white/10 font-display text-xl font-bold text-white">
                    {s.title.charAt(0)}
                  </span>
                )}
              </Link>

              <button
                onClick={togglePlay}
                aria-label={paused ? `Play ${s.title}` : `Pause ${s.title}`}
                className="flex flex-col items-center gap-1.5 text-[var(--text)]"
              >
                <span className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass-strong)] shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--accent)] md:size-14">
                  {paused ? <Play className="size-5 fill-current md:size-6" /> : <Pause className="size-5 fill-current md:size-6" />}
                </span>
                <span className="text-[11px] font-semibold md:text-xs">{paused ? "Play" : "Pause"}</span>
              </button>

              <Link href={href} className="flex flex-col items-center gap-1.5 text-[var(--text)]" aria-label={`View details for ${s.title}`}>
                <span className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass-strong)] shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--accent)] md:size-14">
                  <Info className="size-5 md:size-6" />
                </span>
                <span className="text-[11px] font-semibold md:text-xs">Details</span>
              </Link>

              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="flex flex-col items-center gap-1.5 text-[var(--text)]">
                <span className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass-strong)] shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--accent)] md:size-14">
                  {muted ? <VolumeX className="size-5 md:size-6" /> : <Volume2 className="size-5 md:size-6" />}
                </span>
                <span className="text-[11px] font-semibold md:text-xs">{muted ? "Unmute" : "Mute"}</span>
              </button>
            </div>

            <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 md:hidden">
              <button
                onClick={() => scrollToSlide(Math.max(active - 1, 0))}
                disabled={active === 0}
                aria-label="Previous trailer"
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition active:scale-95",
                  active === 0 && "opacity-30"
                )}
              >
                <ChevronUp className="size-5" />
              </button>
              <Link
                href={href}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/15 bg-black/45 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur"
              >
                View {s.type === "movie" ? "movie" : "series"}
              </Link>
              <button
                onClick={() => scrollToSlide(Math.min(active + 1, items.length - 1))}
                disabled={active === items.length - 1}
                aria-label="Next trailer"
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition active:scale-95",
                  active === items.length - 1 && "opacity-30"
                )}
              >
                <ChevronDown className="size-5" />
              </button>
            </div>
          </section>
        );
      })}

      {/* Desktop up/down controls */}
      <div className="fixed bottom-8 right-6 z-30 hidden flex-col gap-2 md:flex">
        <button
          onClick={() => scrollToSlide(Math.max(active - 1, 0))}
          disabled={active === 0}
          aria-label="Previous"
          className={cn(
            "grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--text)] shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--accent)]",
            active === 0 && "opacity-30"
          )}
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          onClick={() => scrollToSlide(Math.min(active + 1, items.length - 1))}
          disabled={active === items.length - 1}
          aria-label="Next"
          className={cn(
            "grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--text)] shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--accent)]",
            active === items.length - 1 && "opacity-30"
          )}
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
    </div>
  );
}
