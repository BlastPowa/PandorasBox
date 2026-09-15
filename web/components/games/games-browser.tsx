"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Building2, CalendarDays, Gamepad2, Images, Search, SlidersHorizontal, Star, Users, X } from "lucide-react";
import type { GameCard as GameCardData, GameSort } from "@/lib/igdb";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { GameCard } from "./game-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { AmbientBackground, HERO_SLIDE_EVENT } from "@/components/home/ambient-background";
import { cn } from "@/lib/utils";

export interface GamesLandingData {
  popular: GameCardData[];
  mostPlayed: GameCardData[];
  topRated: GameCardData[];
  upcoming: GameCardData[];
  newReleases: GameCardData[];
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
  const [pinnedSort, setPinnedSort] = useState<GameSort | null>(null);
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
  const heroSlides = useMemo(() => {
    const seen = new Set<number>();
    return [...initial.upcoming, ...initial.popular]
      .filter((game) => game.backdropUrl && !seen.has(game.id) && seen.add(game.id))
      .slice(0, 6);
  }, [initial.popular, initial.upcoming]);
  const curatedRails = useMemo(() => {
    const rows = [
      { sort: "popular" as const, title: "Popular right now", eyebrow: "Trending", description: "Games drawing the most attention right now.", games: initial.popular.slice(0, 18) },
      { sort: "most_played" as const, title: "Most played on Steam", eyebrow: "Live CCU", description: "Current Steam player counts, refreshed in small cached batches.", games: initial.mostPlayed },
      { sort: "top_rated" as const, title: "Highest rated", eyebrow: "Critics & players", description: "Acclaimed games with enough ratings to keep the list useful.", games: initial.topRated },
      { sort: "upcoming" as const, title: "Coming soon", eyebrow: "Upcoming", description: "Release dates, platforms and quick story previews before launch.", games: initial.upcoming },
      { sort: "new" as const, title: "New releases", eyebrow: "Just landed", description: "Fresh releases worth checking out now.", games: initial.newReleases },
    ];
    if (!pinnedSort) return rows;
    const selected = rows.find((row) => row.sort === pinnedSort);
    return selected ? [selected, ...rows.filter((row) => row.sort !== pinnedSort)] : rows;
  }, [initial.mostPlayed, initial.newReleases, initial.popular, initial.topRated, initial.upcoming, pinnedSort]);

  function applyFilters() {
    setFilters(draftFilters);
    setFilterOpen(false);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  }

  function selectSort(next: GameSort) {
    if (pinnedSort === next) {
      setPinnedSort(null);
      setSort("popular");
      return;
    }
    setPinnedSort(next);
    setSort(next);
  }

  return (
    <div className="space-y-8 pb-8">
      <AmbientBackground imageUrl={heroSlides[0]?.backdropUrl ?? null} />
      <GamesHero slides={heroSlides} />

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
              return <button key={tab.value} type="button" onClick={() => selectSort(tab.value)} aria-pressed={pinnedSort === tab.value} className={cn("flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-xs font-bold transition", pinnedSort === tab.value ? "border-[rgb(var(--accent-rgb)/0.28)] bg-[rgb(var(--accent-rgb)/0.10)] text-[var(--accent)] shadow-[0_10px_28px_rgb(var(--accent-rgb)/0.12)]" : "border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_82%,transparent)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]")}><Icon className="size-4" />{tab.label}</button>;
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
          {curatedRails.map((row) => (
            <GameRail
              key={row.sort}
              title={row.title}
              eyebrow={row.eyebrow}
              description={row.description}
              games={row.games}
              upcoming={row.sort === "upcoming"}
              highlighted={pinnedSort === row.sort}
            />
          ))}
        </div>
      )}

      <section className="space-y-4" aria-live="polite">
        <div className="flex items-end justify-between gap-3"><div><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Browse catalog</span><h2 className="font-display text-2xl font-extrabold">{resultLabel}</h2></div>{hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-[var(--accent)]">Clear filters</button>}</div>
        {loading ? <GameGridSkeleton /> : games.length === 0 ? <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_84%,transparent)] px-5 py-16 text-center text-sm text-[var(--text-muted)] backdrop-blur-md">No games match those filters. Try widening your search.</div> : <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>}
      </section>
    </div>
  );
}

function GamesHero({ slides }: { slides: GameCardData[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);
  const active = slides[index];
  useEffect(() => {
    if (!active?.backdropUrl) return;
    window.dispatchEvent(new CustomEvent<string | null>(HERO_SLIDE_EVENT, { detail: active.backdropUrl }));
  }, [active?.backdropUrl]);
  if (!active) return null;
  return <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} className="relative isolate min-h-[500px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_28px_80px_rgba(15,23,42,.10)] sm:min-h-[560px] lg:min-h-[620px]">
    <Image key={active.id} src={active.backdropUrl!} alt="" fill priority sizes="(max-width: 768px) 100vw, 1400px" className="object-cover object-center opacity-55 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,.58)_0%,rgba(5,7,12,.10)_58%,rgba(5,7,12,.28)_100%),linear-gradient(0deg,rgba(5,7,12,.72)_0%,transparent_64%)]" />
    <div className="relative grid min-h-[500px] items-end gap-5 p-5 pb-16 sm:min-h-[560px] sm:p-10 sm:pb-20 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)] lg:p-14 lg:pb-24">
      <div className="max-w-2xl rounded-[28px] border border-white/16 bg-black/22 p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,.22)] backdrop-blur-xl sm:p-7">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md"><Gamepad2 className="size-3.5" /> Featured {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
        <h1 className="max-w-[18ch] font-display text-3xl font-extrabold leading-[1] tracking-[-.035em] text-white sm:text-5xl">{active.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/75">{active.rating !== null && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-[var(--gold)] text-[var(--gold)]" />{active.rating.toFixed(1)}</span>}{active.year && <span>{active.year}</span>}{active.platforms.slice(0, 3).map((platform) => <span key={platform} className="rounded-full border border-white/15 bg-white/10 px-2 py-1 backdrop-blur-md">{platform}</span>)}</div>
        {active.summary && <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base">{active.summary}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><Link href={`/game/${active.id}`} className="pb-uiverse-button inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--accent-hover)]">View details <ArrowRight className="size-4" /></Link><a href="#game-catalog" className="pb-uiverse-button pb-uiverse-button--glass inline-flex min-h-12 items-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md">Explore games</a></div>
      </div>
      <div className="hidden rounded-[26px] border border-white/16 bg-black/18 p-3 shadow-[0_22px_65px_rgba(0,0,0,.20)] backdrop-blur-xl lg:block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-white/12">
          <Image key={`preview-${active.id}`} src={active.backdropUrl!} alt="" fill sizes="420px" className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-white">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Now showing</p><p className="mt-0.5 line-clamp-1 text-sm font-bold">{active.name}</p></div>
            {active.coverUrl && <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg border border-white/20"><Image src={active.coverUrl} alt="" fill sizes="48px" className="object-cover" /></div>}
          </div>
        </div>
      </div>
    </div>
    <div className="absolute bottom-6 right-5 flex gap-1.5 sm:bottom-9 sm:right-10">{slides.map((game, slideIndex) => <button key={game.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Show ${game.name}`} aria-current={slideIndex === index ? "true" : undefined} className={cn("relative h-1.5 overflow-hidden rounded-full bg-[var(--border-strong)] transition-[width]", slideIndex === index ? "w-12" : "w-3")}>{slideIndex === index && <span key={`${index}-${paused}`} className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]", reducedMotion || paused ? "w-full" : "pb-game-hero-progress")} />}</button>)}</div>
  </section>;
}

function GameRail({ title, eyebrow, description, games, upcoming = false, highlighted = false }: { title: string; eyebrow: string; description: string; games: GameCardData[]; upcoming?: boolean; highlighted?: boolean }) {
  if (games.length === 0) return null;
  return <section className={cn("space-y-3 rounded-[26px] transition", highlighted && "border border-[rgb(var(--accent-rgb)/0.20)] bg-[rgb(var(--accent-rgb)/0.045)] p-4 shadow-[0_20px_55px_rgb(var(--accent-rgb)/0.08)] sm:p-5")}><div className="flex items-end justify-between gap-4"><div><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}{highlighted ? " · Selected" : ""}</span><h2 className="font-display text-xl font-extrabold sm:text-2xl">{title}</h2><p className="hidden text-xs text-[var(--text-muted)] sm:block">{description}</p></div><span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Swipe to explore</span></div><div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-none md:-mx-0 md:px-0">{games.map((game) => upcoming ? <UpcomingGameCard key={game.id} game={game} /> : <GameCard key={game.id} game={game} className="w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-[180px]" />)}</div></section>;
}

function UpcomingGameCard({ game }: { game: GameCardData }) {
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const images = game.previewImages.length > 0 ? game.previewImages : [game.backdropUrl, game.coverUrl].filter((url): url is string => Boolean(url));

  useEffect(() => {
    if (!hovered || reducedMotion || images.length < 2) return;
    const timer = window.setInterval(() => setImageIndex((current) => (current + 1) % images.length), 1800);
    return () => window.clearInterval(timer);
  }, [hovered, images.length, reducedMotion]);

  const releaseLabel = game.releaseDate
    ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(game.releaseDate))
    : game.year?.toString() ?? "Release date TBA";
  const studioLabel = game.developers[0] ?? game.publishers[0] ?? "Studio TBA";
  const popupPosition = hovered && anchorRect && typeof window !== "undefined"
    ? {
        top: Math.max(16, Math.min(anchorRect.top - 36, window.innerHeight - 470)),
        left: Math.max(16, Math.min(anchorRect.right + 14, window.innerWidth - 386)),
      }
    : null;

  function cancelClose() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openPreview() {
    cancelClose();
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
    }
    setHovered(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setHovered(false);
      setImageIndex(0);
    }, 140);
  }

  const previewBody = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-[var(--bg-elevated)]">
        {images[imageIndex] ? <Image key={`${game.id}-preview-${imageIndex}`} src={images[imageIndex]} alt="" fill sizes="380px" className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" /> : <div className="size-full bg-[var(--bg-elevated)]" />}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,5,8,.82),transparent_56%)]" />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/60">Releases {releaseLabel}</p><p className="truncate text-sm font-extrabold">{game.name}</p></div>
          {game.rating !== null && <span className="shrink-0 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[10px] font-bold">★ {game.rating.toFixed(1)}</span>}
        </div>
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.slice(0, 5).map((source, index) => <button key={source} type="button" onClick={() => setImageIndex(index)} aria-label={`Show ${game.name} preview ${index + 1}`} className={cn("relative aspect-video w-14 shrink-0 overflow-hidden rounded-lg border", index === imageIndex ? "border-[var(--accent)]" : "border-[var(--border)] opacity-70")}><Image src={source} alt="" fill sizes="56px" className="object-cover" /></button>)}
        </div>
      )}
      <div className="mt-3 space-y-3">
        {game.summary && <p className="line-clamp-4 text-xs leading-5 text-[var(--text-secondary)]">{game.summary}</p>}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="pb-uiverse-row rounded-xl p-2.5"><span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"><CalendarDays className="size-3.5 text-[var(--accent)]" />Release</span><p className="mt-1 font-bold text-[var(--text)]">{releaseLabel}</p></div>
          <div className="pb-uiverse-row rounded-xl p-2.5"><span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"><Building2 className="size-3.5 text-[var(--accent)]" />Studio</span><p className="mt-1 truncate font-bold text-[var(--text)]">{studioLabel}</p></div>
        </div>
        {game.platforms.length > 0 && <div className="flex flex-wrap gap-1.5">{game.platforms.slice(0, 5).map((platform) => <span key={platform} className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[9px] font-bold text-[var(--text-muted)]">{platform}</span>)}</div>}
        <Link href={`/game/${game.id}`} className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold text-white">View full game page <ArrowRight className="size-3.5" /></Link>
      </div>
    </>
  );

  return (
    <article
      ref={cardRef}
      onMouseEnter={openPreview}
      onMouseLeave={scheduleClose}
      onFocusCapture={openPreview}
      onBlurCapture={scheduleClose}
      className="group relative w-[68vw] max-w-[330px] shrink-0 snap-start sm:w-[300px]"
    >
      <Link href={`/game/${game.id}`} className="pb-uiverse-card pb-aura block overflow-hidden rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] shadow-[0_18px_45px_rgba(15,23,42,.10)] backdrop-blur-xl">
        <div className="relative aspect-[16/10] overflow-hidden">
          {images[0] ? <Image src={images[0]} alt="" fill sizes="330px" className="object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="size-full bg-[var(--bg-elevated)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/12 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Coming soon · {releaseLabel}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-extrabold leading-tight">{game.name}</h3>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
          <div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--text)]">{studioLabel}</p><p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{game.platforms.slice(0, 2).join(" · ") || "Platforms TBA"}</p></div>
          <span className="hidden items-center gap-1 text-[10px] font-extrabold text-[var(--accent)] md:inline-flex"><Images className="size-3.5" /> Hover preview</span>
        </div>
      </Link>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Trigger asChild><button type="button" className="pb-uiverse-button pb-uiverse-button--glass mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] md:hidden"><Images className="size-4" /> Quick look</button></Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 max-h-[88dvh] overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-[0_28px_90px_rgba(0,0,0,.26)] sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2">
            <div className="mb-2 flex items-center justify-between px-1"><Dialog.Title className="text-sm font-extrabold">Quick look</Dialog.Title><Dialog.Close className="grid size-9 place-items-center rounded-full hover:bg-[var(--bg-elevated)]" aria-label="Close preview"><X className="size-4" /></Dialog.Close></div>
            {previewBody}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {hovered && popupPosition && typeof document !== "undefined" && createPortal(
        <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="fixed z-[70] hidden w-[370px] rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)] p-3 shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur-2xl md:block motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150" style={popupPosition}>
          {previewBody}
        </div>,
        document.body,
      )}
    </article>
  );
}

function GameFilterFields({ value, onChange }: { value: FilterState; onChange: (next: FilterState) => void }) {
  const fieldClass = "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 text-base outline-none focus:border-[var(--accent)] sm:text-sm";
  return <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Platform<select value={value.platform} onChange={(event) => onChange({ ...value, platform: event.target.value })} className={fieldClass}>{PLATFORM_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Genre<select value={value.genre} onChange={(event) => onChange({ ...value, genre: event.target.value })} className={fieldClass}>{GENRE_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Release window<select value={value.yearFrom} onChange={(event) => onChange({ ...value, yearFrom: event.target.value })} className={fieldClass}><option value="">Any year</option><option value="2026">2026 onward</option><option value="2020">2020 onward</option><option value="2015">2015 onward</option><option value="2010">2010 onward</option></select></label><label className="space-y-1.5 text-xs font-bold text-[var(--text-secondary)]">Minimum rating<select value={value.ratingMin} onChange={(event) => onChange({ ...value, ratingMin: event.target.value })} className={fieldClass}><option value="">Any rating</option><option value="7">7+</option><option value="8">8+</option><option value="9">9+</option></select></label></div>;
}

function GameGridSkeleton() {
  return <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 18 }).map((_, index) => <PosterSkeleton key={index} />)}</div>;
}
