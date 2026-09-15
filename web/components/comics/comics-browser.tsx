"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownAZ, ArrowRight, BookOpenCheck, CalendarDays, Grid2X2, Rows3, Search, X } from "lucide-react";
import type { ComicSeries, Publisher } from "@/lib/comics-shared";
import { PUBLISHER_LABEL } from "@/lib/comics-shared";
import { ComicCard } from "./comic-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui-fx/input";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { useLibrary } from "@/lib/library/use-library";

const TABS: { value: Publisher; label: string }[] = [
  { value: "marvel", label: "Marvel" },
  { value: "dc", label: "DC" },
  { value: "image", label: "Image" },
  { value: "darkhorse", label: "Dark Horse" },
  { value: "idw", label: "IDW" },
];

const YEAR_RANGES = [
  { value: "all", label: "All years", min: 0, max: 9999 },
  { value: "2020", label: "2020s", min: 2020, max: 2029 },
  { value: "2010", label: "2010s", min: 2010, max: 2019 },
  { value: "2000", label: "2000s", min: 2000, max: 2009 },
  { value: "1990", label: "1990s", min: 1990, max: 1999 },
  { value: "1980", label: "1980s", min: 1980, max: 1989 },
  { value: "classic", label: "Before 1980", min: 0, max: 1979 },
] as const;

type YearRange = (typeof YEAR_RANGES)[number]["value"];
type ComicSort = "release-desc" | "release-asc" | "issues-desc" | "title-asc";
type ComicView = "grid" | "list";

export function ComicsBrowser({ initial }: { initial: ComicSeries[] }) {
  const [publisher, setPublisher] = useState<Publisher>("marvel");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [comics, setComics] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [yearRange, setYearRange] = useState<YearRange>("all");
  const [sort, setSort] = useState<ComicSort>("release-desc");
  const [view, setView] = useState<ComicView>("grid");
  const hydrated = useRef(false);
  const { items, signedIn } = useLibrary();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const url = debounced.length >= 2
      ? `/api/comics?q=${encodeURIComponent(debounced)}`
      : `/api/comics?publisher=${publisher}`;
    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setComics(Array.isArray(data.results) ? data.results : []))
      .catch((error) => {
        if (error.name !== "AbortError") setComics([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [publisher, debounced]);

  const searching = debounced.length >= 2;
  const displayComics = useMemo(() => {
    const range = YEAR_RANGES.find((option) => option.value === yearRange) ?? YEAR_RANGES[0];
    return comics
      .filter((comic) => yearRange === "all" || (comic.startYear !== null && comic.startYear >= range.min && comic.startYear <= range.max))
      .slice()
      .sort((a, b) => {
        if (sort === "release-asc") return (a.startYear ?? 9999) - (b.startYear ?? 9999) || a.name.localeCompare(b.name);
        if (sort === "issues-desc") return b.issueCount - a.issueCount || a.name.localeCompare(b.name);
        if (sort === "title-asc") return a.name.localeCompare(b.name);
        return (b.startYear ?? 0) - (a.startYear ?? 0) || a.name.localeCompare(b.name);
      });
  }, [comics, sort, yearRange]);

  const featured = displayComics[0] ?? null;
  const continueReading = useMemo(() => items
    .filter((item) => item.type === "comic" && (item.progress.currentChapter ?? 0) > 0 && item.status !== "completed" && item.id.startsWith("comicvine-"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8), [items]);

  return (
    <div className="space-y-7 sm:space-y-8">
      <DiscoveryPageHeader
        eyebrow="Your reading corner"
        title="Comics"
        description="Find a run, keep your exact issue progress, and pick up where you left off without losing the artwork-first PBox feel."
        actions={
          <SearchInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all comics…"
            aria-label="Search comics"
            icon={<Search className="size-4" aria-hidden="true" />}
            trailing={query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear comic search" className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)]"><X className="size-4" /></button> : null}
            className="sm:w-80"
          />
        }
      />

      {!searching && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button key={tab.value} onClick={() => setPublisher(tab.value)} aria-pressed={publisher === tab.value} className={cn("shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition-all", publisher === tab.value ? "border-transparent bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white shadow-[0_8px_24px_rgb(var(--accent-rgb)/0.18)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:border-[rgb(var(--accent-rgb)/0.34)] hover:text-[var(--text)]")}>{tab.label}</button>
          ))}
        </div>
      )}

      {!loading && featured && (
        <section className="pb-uiverse-card pb-uiverse-card--hero pb-aura relative min-h-[330px] overflow-hidden rounded-[28px] border border-[var(--border)] sm:min-h-[390px]">
          {featured.coverUrl && <Image src={featured.coverUrl} alt="" fill priority sizes="(max-width: 768px) 100vw, 1200px" className="scale-[1.08] object-cover object-[center_28%] opacity-75" />}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,10,.94)_0%,rgba(6,7,10,.74)_43%,rgba(6,7,10,.22)_78%,rgba(6,7,10,.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,7,10,.9)_0%,transparent_55%)]" />
          <div className="relative z-10 flex min-h-[330px] max-w-2xl flex-col justify-end p-5 text-white sm:min-h-[390px] sm:p-8 lg:p-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">Featured from {searching ? "search" : featured.publisher === "other" ? "independent comics" : PUBLISHER_LABEL[featured.publisher]}</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">{featured.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/70">
              {featured.startYear !== null && <span>{featured.startYear}</span>}
              {featured.startYear !== null && featured.issueCount > 0 && <span>•</span>}
              {featured.issueCount > 0 && <span>{featured.issueCount} issues</span>}
            </div>
            {featured.synopsis && <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-white/76 sm:text-[15px]">{featured.synopsis}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/comic/${featured.id}`} className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-extrabold text-white">Open series <ArrowRight className="size-4" /></Link>
              <a href="#comic-catalog" className="pb-uiverse-button pb-uiverse-button--glass inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-bold text-white">Browse this shelf</a>
            </div>
          </div>
        </section>
      )}

      {signedIn && continueReading.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]">Your library</p>
              <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">Continue reading</h2>
            </div>
            <Link href="/library" className="text-xs font-bold text-[var(--text-muted)] transition hover:text-[var(--accent)]">View library</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {continueReading.map((item) => {
              const current = item.progress.currentChapter ?? 0;
              const total = item.totalChapters ?? 0;
              const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
              return (
                <Link key={item.id} href={`/comic/${item.id.replace("comicvine-", "")}`} className="pb-uiverse-card pb-uiverse-card--compact group grid min-w-[260px] grid-cols-[62px_1fr] gap-3 rounded-[18px] p-2.5 sm:min-w-[300px]">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--bg-elevated)]">{item.posterUrl ? <Image src={item.posterUrl} alt="" fill sizes="62px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid size-full place-items-center"><BookOpenCheck className="size-5 text-[var(--accent)]" /></div>}</div>
                  <div className="min-w-0 py-1">
                    <h3 className="truncate text-sm font-bold text-[var(--text)]">{item.title}</h3>
                    <p className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">Issue position {current}{total > 0 ? ` of ${total}` : ""}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${total > 0 ? percent : Math.min(100, current * 4)}%` }} /></div>
                    <p className="mt-2 text-[10px] font-bold text-[var(--accent)]">Keep reading →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section id="comic-catalog" className="space-y-4 scroll-mt-24">
        <div className="pb-uiverse-card pb-uiverse-card--compact flex flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="relative">
              <span className="sr-only">Filter comics by year</span>
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--accent)]" />
              <select value={yearRange} onChange={(event) => setYearRange(event.target.value as YearRange)} className="h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-8 text-xs font-semibold text-[var(--text)] sm:w-40">
                {YEAR_RANGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Order comics</span>
              <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--accent)]" />
              <select value={sort} onChange={(event) => setSort(event.target.value as ComicSort)} className="h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-8 text-xs font-semibold text-[var(--text)] sm:w-48">
                <option value="release-desc">Newest releases</option>
                <option value="release-asc">Oldest releases</option>
                <option value="issues-desc">Most issues</option>
                <option value="title-asc">Title A–Z</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs font-medium text-[var(--text-muted)]" aria-live="polite"><span className="font-bold text-[var(--text)]">{displayComics.length}</span> series</p>
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1" aria-label="Comic view">
              <button type="button" onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"} className={cn("grid size-8 place-items-center rounded-lg transition", view === "grid" ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]" : "text-[var(--text-muted)]")}><Grid2X2 className="size-4" /></button>
              <button type="button" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} className={cn("grid size-8 place-items-center rounded-lg transition", view === "list" ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]" : "text-[var(--text-muted)]")}><Rows3 className="size-4" /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">{Array.from({ length: 24 }).map((_, index) => <PosterSkeleton key={index} />)}</div>
        ) : displayComics.length === 0 ? (
          <p className="pb-uiverse-card rounded-[20px] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
            {comics.length === 0 ? (searching ? `No comics found for “${debounced}”.` : "Couldn't load comics — Comic Vine may be temporarily unavailable.") : "No comics match that year range. Try another period."}
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {displayComics.map((comic) => <ComicCard key={comic.id} comic={comic} />)}
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {displayComics.map((comic) => <ComicCard key={comic.id} comic={comic} view="list" />)}
          </div>
        )}
      </section>
    </div>
  );
}
