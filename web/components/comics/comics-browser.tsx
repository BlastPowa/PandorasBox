"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownAZ, CalendarDays, Search, X } from "lucide-react";
import type { ComicSeries, Publisher } from "@/lib/comics-shared";
import { ComicCard } from "./comic-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui-fx/input";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

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

export function ComicsBrowser({ initial }: { initial: ComicSeries[] }) {
  const [publisher, setPublisher] = useState<Publisher>("marvel");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [comics, setComics] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [yearRange, setYearRange] = useState<YearRange>("all");
  const [sort, setSort] = useState<ComicSort>("release-desc");
  const hydrated = useRef(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <DiscoveryPageHeader
          title="Comics"
          description="Browse larger publisher catalogs, filter by era, and track complete issue runs in release order."
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
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button key={tab.value} onClick={() => setPublisher(tab.value)} aria-pressed={publisher === tab.value} className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all", publisher === tab.value ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]" : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]")}>{tab.label}</button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]/75 p-3 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="text-xs font-medium text-[var(--text-muted)]" aria-live="polite">Showing <span className="font-bold text-[var(--text)]">{displayComics.length}</span> of {comics.length} series</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">{Array.from({ length: 24 }).map((_, index) => <PosterSkeleton key={index} />)}</div>
      ) : displayComics.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
          {comics.length === 0 ? (searching ? `No comics found for “${debounced}”.` : "Couldn't load comics — Comic Vine may be temporarily unavailable.") : "No comics match that year range. Try another period."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {displayComics.map((comic) => <ComicCard key={comic.id} comic={comic} />)}
        </div>
      )}
    </div>
  );
}
