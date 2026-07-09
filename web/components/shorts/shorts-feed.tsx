"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Info, Volume2, VolumeX, Play, Pause, ChevronUp, ChevronDown } from "lucide-react";
import type { ShortItem } from "@/lib/trailers";
import { truncateText } from "@core/utils/formatters";
import { cn } from "@/lib/utils";

/** Sends a command to a YouTube iframe via its postMessage JS API. */
function ytCommand(iframe: HTMLIFrameElement | null, func: "playVideo" | "pauseVideo") {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
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
    slideRefs.current[idx]?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
      <div className="grid h-[70vh] place-items-center px-6 text-center text-sm text-[var(--text-secondary)]">
        No trailers available right now. Add a TMDB key, or check back once trending titles have trailers.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-2px)] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
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
            {/* Whole-slide blurred backdrop of the poster (lordflix look) — the
                page behind the card is a soft, dark-tinted blow-up of the art,
                never a flat black rectangle. */}
            {s.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.posterUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-125 object-cover opacity-40 blur-3xl" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-black/55" />

            {/* Portrait player card — the trailer is letterboxed inside a tall
                rounded card, title/meta pinned to its bottom, rail outside it.
                Sized responsively: near-square-tall on desktop, full-width on
                phones so the player fills the screen like a real short. */}
            <div className="relative z-10 h-full max-h-[94dvh] w-full max-w-[min(94vw,460px)] overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-sm">
              {/* Blurred poster fills the card's letterbox area */}
              {s.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.posterUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-2xl" />
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 space-y-1.5 bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.55)_55%,transparent)] p-5 pt-16">
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
            <div className="absolute bottom-24 right-3 z-20 flex shrink-0 flex-col items-center gap-4 sm:static sm:bottom-auto sm:right-auto sm:z-10 sm:pb-0">
              <Link href={href} className="relative block h-24 w-16 overflow-hidden rounded-[var(--radius-md)] border border-white/20 shadow-lg transition hover:scale-105">
                {s.posterUrl ? (
                  <Image src={s.posterUrl} alt={s.title} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center bg-white/10 font-display text-xl font-bold text-white">
                    {s.title.charAt(0)}
                  </span>
                )}
              </Link>

              <Link href={href} className="flex flex-col items-center gap-1.5 text-white" aria-label={`View details for ${s.title}`}>
                <span className="grid size-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25">
                  <Info className="size-6" />
                </span>
                <span className="text-xs font-semibold">Details</span>
              </Link>

              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="flex flex-col items-center gap-1.5 text-white">
                <span className="grid size-14 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25">
                  {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                </span>
                <span className="text-xs font-semibold">Audio</span>
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
            "grid size-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60",
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
            "grid size-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60",
            active === items.length - 1 && "opacity-30"
          )}
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
    </div>
  );
}
