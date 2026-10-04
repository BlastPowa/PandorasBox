"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Info, Pause, Play, Sparkles, Star } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { mediaItemHref } from "@/lib/library/item-href";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function CinematicSpotlight({ items }: { items: UnifiedSearchResult[] }) {
  const slides = useMemo(() => items.filter((item) => item.backdropUrl).slice(0, 6), [items]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const current = slides[index % Math.max(1, slides.length)];
  const [artwork, setArtwork] = useState(slides[0]?.backdropUrl ?? null);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    const home = heroRef.current?.closest<HTMLElement>(".pb-cinema-home");
    if (home && artwork) home.style.setProperty("--pb-home-artwork", `url(${JSON.stringify(artwork)})`);
    return () => { home?.style.removeProperty("--pb-home-artwork"); };
  }, [artwork]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || interacting || hidden || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 8000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, interacting, hidden, reducedMotion, index]);

  useEffect(() => {
    const nextArtwork = current?.backdropUrl;
    if (!nextArtwork || nextArtwork === artwork) return;
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (cancelled) return;
      setPrevious(artwork);
      setArtwork(nextArtwork);
    };
    image.src = nextArtwork;
    return () => { cancelled = true; };
  }, [current?.backdropUrl, artwork]);

  useEffect(() => {
    const next = slides[(index + 1) % Math.max(1, slides.length)]?.backdropUrl;
    if (!next || hidden) return;
    const timer = window.setTimeout(() => { const image = new window.Image(); image.src = next; }, 1500);
    return () => window.clearTimeout(timer);
  }, [index, slides, hidden]);

  function step(direction: number) { setIndex((value) => (value + direction + slides.length) % slides.length); }

  return (
    <section ref={heroRef} className="pb-cinema-hero" aria-label="Pandora's Box Spotlight" aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div className="pb-cinema-artwork" aria-hidden="true">
        {previous && <div className="pb-cinema-artwork-layer" style={{ backgroundImage: `url(${JSON.stringify(previous)})` }} />}
        {artwork && <div key={artwork} className="pb-cinema-artwork-layer pb-cinema-artwork-enter" style={{ backgroundImage: `url(${JSON.stringify(artwork)})` }} />}
      </div>
      <div className="pb-cinema-hero-scrim" aria-hidden="true" />
      <div className="pb-cinema-hero-content">
        <div className="pb-cinema-hero-copy">
          <p className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/75">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md"><Sparkles className="size-3" /> Pandora&apos;s Box</span>
            <span>Spotlight · {current?.type === "series" ? "TV series" : current?.type ?? "Discover"}{current?.year ? ` · ${current.year}` : ""}</span>
          </p>
          <h1 className="pb-cinema-title">{current?.title ?? "Your next favourite story."}</h1>
          {current && <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-white/80">
            {current.score != null && <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-[var(--gold)] text-[var(--gold)]" /> {current.score.toFixed(1)} <span className="text-white/45">/ 10</span></span>}
            <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Trending now</span>
          </div>}
          <p className="mt-5 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base sm:leading-7">{current?.synopsis ?? "Discover movies, shows, anime and more. Keep every story and every bit of progress in one place."}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {current && <Link href={mediaItemHref(current)} className="pb-cinema-primary"><Info className="size-4" /> More info</Link>}
            <Link href="/browse" className="pb-cinema-secondary"><Compass className="size-4" /> Explore</Link>
          </div>
          {slides.length > 1 && <div className="mt-9 flex items-center gap-2" aria-label="Spotlight controls">
            <div className="mr-3 flex gap-1.5">{slides.map((slide, slideIndex) => <button key={slide.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Show ${slide.title}`} aria-current={slideIndex === index ? "true" : undefined} className={`pb-cinema-slide${slideIndex === index ? " is-active" : ""}`} />)}</div>
            <button type="button" className="pb-cinema-control" aria-label="Previous spotlight" onClick={() => step(-1)}><ChevronLeft className="size-4" /></button>
            <button type="button" className="pb-cinema-control" aria-label="Next spotlight" onClick={() => step(1)}><ChevronRight className="size-4" /></button>
            <button type="button" className="pb-cinema-control" aria-label={paused ? "Play spotlight slideshow" : "Pause spotlight slideshow"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}</button>
          </div>}
        </div>
        {slides.length > 1 && <div className="pb-cinema-up-next">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/55">Up next in Spotlight</p>
          <div className="grid grid-cols-3 gap-3">{[1, 2, 3].slice(0, slides.length - 1).map((offset) => {
            const nextIndex = (index + offset) % slides.length;
            const item = slides[nextIndex];
            return <button key={item.id} type="button" onClick={() => setIndex(nextIndex)} className="group min-w-0 text-left" aria-label={`Show ${item.title}`}>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/20 bg-black/20"><Image src={item.backdropUrl!} alt="" fill sizes="180px" className="object-cover transition duration-500 group-hover:scale-105" /></div>
              <span className="mt-2 block truncate text-[11px] font-medium text-white/65 group-hover:text-white">{item.title}</span>
            </button>;
          })}</div>
        </div>}
      </div>
    </section>
  );
}
