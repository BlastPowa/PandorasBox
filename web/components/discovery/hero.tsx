"use client";

import { useEffect, useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { truncateText } from "@core/utils/formatters";
import { TypeBadge } from "@/components/ui-fx/badge";
import { Sparkles, Star, Calendar } from "lucide-react";
import { HERO_SLIDE_EVENT } from "@/components/home/ambient-background";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { HomeHeroActions } from "./home-hero-actions";

export function Hero({ items }: { items: UnifiedSearchResult[] }) {
  // Only titles with wide 16:9 artwork can headline — the hero image is the
  // full-bleed page background, and a portrait poster upscales into a blurry,
  // badly-cropped mess at that size.
  const slides = items.filter((i) => i.backdropUrl).slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (slides.length <= 1 || paused || reducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length, paused, reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const activeSlide = slides[index];

  // Let the ambient background layer follow the slideshow without lifting state.
  useEffect(() => {
    if (!activeSlide?.backdropUrl) return;
    window.dispatchEvent(new CustomEvent(HERO_SLIDE_EVENT, { detail: activeSlide.backdropUrl }));
  }, [activeSlide?.backdropUrl]);

  if (slides.length === 0) return null;
  const active = activeSlide;
  const href = `/title/${active.type}/${active.source}/${active.anilistId ?? active.tmdbId ?? active.id}`;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      className="relative -mx-4 -mt-6 flex h-[min(78vh,calc(100dvh-190px))] min-h-[380px] flex-col justify-end sm:h-[min(86vh,calc(100dvh-170px))] sm:min-h-[460px] md:-mx-8"
    >
      {/* No image here — AmbientBackground (fixed, full-viewport) is the one and
          only copy of this artwork, matching the reference site's "the
          slideshow IS the page background" layout. This overlay is just the
          gradient + text/CTAs sitting on top of it. */}
      {/* Deliberately no gradient overlays here. They live on the fixed,
          full-viewport .pb-ambient__scrim instead — this <section> is inside a
          max-w-[1400px] container, so scrims placed here would stop short of
          the image's edges and read as a hard-edged box on wide screens. */}
      <div className="relative flex flex-col gap-4 px-4 pb-28 sm:max-w-2xl sm:px-8 sm:pb-36 md:px-12">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur"><Sparkles className="size-3.5 text-[var(--accent)]" /> PBox Spotlight</span>
        <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] drop-shadow-lg sm:text-7xl">
          {active.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
          {active.score !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5 fill-current text-[var(--gold)]" />
              <span className="font-semibold text-[var(--text)]">{active.score.toFixed(1)}</span>
              <span className="text-[var(--text-muted)]">/10</span>
            </span>
          )}
          {active.year !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {active.year}
            </span>
          )}
          <TypeBadge type={active.type} />
        </div>

        {active.synopsis && (
          <p className="hidden max-w-lg text-sm leading-relaxed text-[var(--text-secondary)] drop-shadow sm:block">
            {truncateText(active.synopsis, 200)}
          </p>
        )}

        <HomeHeroActions item={active} href={href} />

        {/* Clears the fixed mobile bottom nav so the CTAs are never obscured
            or unclickable underneath it — desktop has no bottom nav. */}
        <div className="h-8 sm:hidden" aria-hidden="true" />
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-28 right-4 flex gap-1.5 sm:bottom-36 sm:right-10">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 28 : 8,
                background: i === index ? "#ffffff" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
