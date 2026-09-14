"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, CalendarDays, Gamepad2, Search, SlidersHorizontal, Star, Users, X } from "lucide-react";
import type { GameCard as GameCardData, GameSort } from "@/lib/igdb";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { GameCard } from "./game-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { AmbientBackground } from "@/components/home/ambient-background";
import { cn } from "@/lib/utils";

export interface GamesLandingData {
  popular: GameCardData[];
  mostPlayed: GameCardData[];
  topRated: GameCardData[];
  upcoming: GameCardData[];
}

const TABS: { value: GameSort; label: string; icon: typeof Gamepad2 }[] = [
  { value: "popular", label: "Popular", icon: Gamepad2 },
  { value: "most_played", label: "Live Steam players", icon: Users },
  { value: "top_rated", label: "Highest rated", icon: Star },
  { value: "upcoming", label: "Upcoming", icon: CalendarDays },
  { value: "new", label: "New releases", icon: CalendarDays },
];

const PLATFORM_OPTIONS = [
  ["", "All platforms"], ["6", "PC"], ["167", "PlayStation 5"], ["48", "PlayStation 4"],
  ["169", "Xbox Series"], ["49", "Xbox One"], ["130", "Nintendo Switch"],
] as const;
const GENRE_OPTIONS = [
  ["", "All genres"], ["12", "RPG"], ["31", "Adventure"], ["5", "Shooter"], ["32", "Indie"],
  ["15", "Strategy"], ["8", "Platform"], ["14", "Sport"], ["4", "Fighting"],
] as const;

type FilterState = { platform: string; genre: string; yearFrom: string; ratingMin: string };
const EMPTY_FILTERS: FilterState = { platform: "", genre: "", yearFrom: "", ratingMin: "" };

export function GamesBrowser({ initial }: { initial: GamesLandingData }) {
  const [sort, setSort] = useState<GameSort>("popular");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [games, setGames] = useState(initial.popular);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery.length >= 2) params.set("q", debouncedQuery);
    else params.set("sort", sort);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.yearFrom) params.set("yearFrom", filters.yearFrom);
    if (filters.ratingMin) params.set("ratingMin", filters.ratingMin);
    fetch(`/api/games?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setGames(Array.isArray(data.results) ? data.results : []))
      .catch((error) => { if (error.name !== "AbortError") setGames([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sort, debouncedQuery, filters]);

  const searching = debouncedQuery.length >= 2;
  const hasFilters = Object.values(filters).some(Boolean);
  const showCuratedRows = !searching && !hasFilters;
  const resultLabel = searching ? `Results for “${debouncedQuery}”` : TABS.find((tab) => tab.value === sort)?.label ?? "Games";
  const backdropSlides = useMemo(() => Array.from(new Set([...initial.upcoming, ...initial.popular].map((game) => game.backdropUrl).filter((url): url is string => Boolean(url)))).slice(0, 6), [initial.popular, initial.upcoming]);

  function applyFilters() {
    setFilters(draftFilters);
    setFilterOpen(false);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="space-y-8 pb-8">
      <AmbientBackground imageUrl={backdropSlides[0] ?? null} imageUrls={backdropSlides} intervalMs={7200} />
      <GamesHero popular={initial.popular} upcoming={initial.upcoming} />

      <section id="game-catalog" className="relative z-[2] space-y-5 rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_84%,transparent)] p-4 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">PBox Games</span>
            <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Find your next game</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Search, compare ratings, check current Steam player counts, and track what you want to play.</p>
          </div>
          <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[rgb(var(--accent-rgb)/0.12)] lg:max-w-md">
            <Search className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
            <span className="sr-only">Search games</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--text-muted)] lg:text-sm" />
            {query && <button type="button" onClick={() => setQuery("")} className="grid size-9 place-items-center rounded-full hover:bg-[var(--bg-elevated)]" aria-label="Clear game search"><X className="size-4" /></button>}
          </label>
        </div>

        <div className="relative -mx-1 overflow-hidden">
          <div className="flex snap-x gap-2 overflow-x-auto px-1 pb-2 scrollbar-none" aria-label="Game sorting options">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.value} type="button" onClick={() => setSort(tab.value)} aria-pressed={sort === tab.value} className={cn("flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-xs font-bold transition", sort === tab.value ? "border-[rgb(var(--accent-rgb)/0.28)] bg-[rgb(var(--accent-rgb)/0.10)] text-[var(--accent)]" : "border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_82%,transparent)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]")}><Icon className="size-4" />{tab.label}</button>;
            })}
            <Dialog.Root open={filterOpen} onOpenChange={setFilterOpen}>
              <Dialog.Trigger asChild><button type="button" className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold", hasFilters ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.10)] text-[var(--accent)]" : "border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_82%,transparent)] text-[var(--text-secondary)]")}><SlidersHorizontal className="size-4" /> Filters{hasFilters ? " · On" : ""}</button></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--bg-base)]/35 backdrop-blur-[3px]" />
                <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[28px] border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)] p-5 pb-[calc(var(--safe-bottom)+1.25rem)] shadow-[0_24px_80px_rgba(15,23,42,.18)] backdrop-blur-xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border">
                  <div className="mb-5 flex items-center justify-between"><div><Dialog.Title className="font-display text-xl font-bold">Filter games</Dialog.Title><Dialog.Description className="text-sm text-[var(--text-muted)]">Choose filters, then apply them together.</Dialog.Description></div><Dialog.Close className="grid size-11 place-items-center rounded-full hover:bg-[var(--bg-elevated)]" aria-label="Close filters"><X /></Dialog.Close></div>
                  <GameFilterFields value={draftFilters} onChange={setDraftFilters} />
                  <div className="sticky bottom-0 mt-6 grid grid-cols-[.7fr_1fr] gap-3 bg-[color-mix(in_srgb,var(--bg-surface)_96%,transparent)] pt-3"><button type="button" onClick={clearFilters} className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] font-bold">Clear all</button><button type="button" onClick={applyFilters} className="min-h-12 rounded-xl bg-[var(--accent)] font-bold text-white">Apply filters</button></div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </section>

      {showCuratedRows && (
        <div className="space-y-9">
          <GameRail title="Most played on Steam" eyebrow="Live CCU" description="Current Steam player counts, refreshed in small cached batches." games={initial.mostPlayed} />
          <GameRail title="Highest rated" eyebrow="Critics & players" description="Acclaimed games with enough ratings to keep the list useful." games={initial.topRated} />
          <GameRail title="Coming soon" eyebrow="Upcoming" description="Games building momentum before release." games={initial.upcoming} />
        </div>
      )}

      <section className="space-y-4" aria-live="polite">
        <div className="flex items-end justify-between gap-3"><div><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Browse catalog</span><h2 className="font-display text-2xl font-extrabold">{resultLabel}</h2></div>{hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-[var(--accent)]">Clear filters</button>}</div>
        {loading ? <GameGridSkeleton /> : games.length === 0 ? <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_84%,transparent)] px-5 py-16 text-center text-sm text-[var(--text-muted)] backdrop-blur-md">No games match those filters. Try widening your search.</div> : <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>}
      </section>
    </div>
  );
}

function GamesHero({ popular, upcoming }: { popular: GameCardData[]; upcoming: GameCardData[] }) {
  const slides = useMemo(() => {
    const seen = new Set<number>();
    return [...upcoming, ...popular].filter((game) => game.backdropUrl && !seen.has(game.id) && seen.add(game.id)).slice(0, 6);
  }, [popular, upcoming]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);
  if (slides.length === 0) return null;
  const active = slides[index];
  return <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} className="relative isolate min-h-[500px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_28px_80px_rgba(15,23,42,.10)] sm:min-h-[560px] lg:min-h-[620px]">
    <Image key={active.id} src={active.backdropUrl!} alt="" fill priority sizes="(max-width: 768px) 100vw, 1400px" className="object-cover object-center opacity-55 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700" />
    <div className="absolute inset-0 bg-[var(--cinematic-scrim)] opacity-80" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--bg-surface)_0%,transparent_88%),linear-gradient(0deg,var(--bg-surface)_0%,transparent_62%)] opacity-90" />
    <div className="relative flex min-h-[500px] max-w-2xl flex-col justify-end p-5 pb-16 sm:min-h-[560px] sm:p-10 sm:pb-20 lg:min-h-[620px] lg:p-14 lg:pb-24">
      <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[rgb(var(--accent-rgb)/0.30)] bg-[rgb(var(--accent-rgb)/0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] backdrop-blur-md"><Gamepad2 className="size-3.5" /> Featured game {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
      <h1 className="max-w-[13ch] font-display text-4xl font-extrabold leading-[.95] tracking-[-.04em] text-[var(--text)] sm:text-6xl lg:text-7xl">{active.name}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">{active.rating !== null && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-[var(--gold)] text-[var(--gold)]" />{active.rating.toFixed(1)}</span>}{active.year && <span>{active.year}</span>}{active.platforms.slice(0, 3).map((platform) => <span key={platform} className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_78%,transparent)] px-2 py-1 backdrop-blur-md">{platform}</span>)}</div>
      {active.summary && <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{active.summary}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><Link href={`/game/${active.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--accent-hover)]">View details <ArrowRight className="size-4" /></Link><a href="#game-catalog" className="inline-flex min-h-12 items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] px-6 text-sm font-bold text-[var(--text)] shadow-sm backdrop-blur-md">Explore games</a></div>
    </div>
    <div className="absolute bottom-6 right-5 flex gap-1.5 sm:bottom-9 sm:right-10">{slides.map((game, slideIndex) => <button key={game.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Show ${game.name}`} aria-current={slideIndex === index ? "true" : undefined} className={cn("relative h-1.5 overflow-hidden rounded-full bg-[var(--border-strong)] transition-[width]", slideIndex === index ? "w-12" : "w-3")}>{slideIndex === index && <span key={`${index}-${paused}`} className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]", reducedMotion || paused ? "w-full" : "pb-game-hero-progress")} />}</button>)}</div>
  </section>;
}

function GameRail({ title, eyebrow, description, games }: { title: string; eyebrow: string; description: string; games: GameCardData[] }) {
  if (games.length === 0) return null;
  return <section className="space-y-3"><div className="flex items-end justify-between gap-4"><div><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</span><h2 className="font-display text-xl font-extrabold sm:text-2xl">{title}</h2><p className="hidden text-xs text-[var(--text-muted)] sm:block">{description}</p></div><span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Swipe to explore</span></div><div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-none md:-mx-0 md:px-0">{games.map((game) => <GameCard key={game.id} game={game} className="w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-[180px]" />)}</div></section>;
}

function GameFilterFields({ value, onChange }: { value: FilterState; onChange: (next: FilterState) => void }) {
  const fieldClass = "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 text-base outline-none focus:border-[var(--accent)] sm:text-sm";
  return <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Platform<select value={value.platform} onChange={(event) => onChange({ ...value, platform: event.target.value })} className={fieldClass}>{PLATFORM_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Genre<select value={value.genre} onChange={(event) => onChange({ ...value, genre: event.target.value })} className={fieldClass}>{GENRE_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Release window<select value={value.yearFrom} onChange={(event) => onChange({ ...value, yearFrom: event.target.value })} className={fieldClass}><option value="">Any year</option><option value="2026">2026 onward</option><option value="2020">2020 onward</option><option value="2015">2015 onward</option><option value="2010">2010 onward</option></select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Minimum rating<select value={value.ratingMin} onChange={(event) => onChange({ ...value, ratingMin: event.target.value })} className={fieldClass}><option value="">Any rating</option><option value="7">7+</option><option value="8">8+</option><option value="9">9+</option></select></label></div>;
}

function GameGridSkeleton() {
  return <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 18 }).map((_, index) => <PosterSkeleton key={index} />)}</div>;
}
