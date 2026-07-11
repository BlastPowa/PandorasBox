"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shuffle } from "lucide-react";
import { SlidersHorizontal, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { PosterCard } from "./poster-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { FilterDropdown } from "./filter-dropdown";
import { STREAMING_PROVIDERS, providerLogoUrl } from "@/lib/streaming-providers";
import {
  SORT_OPTIONS,
  genresFor,
  browseYears,
  isSortKey,
  type MediaKind,
  type SortKey,
} from "@/lib/browse-filters";
import type { DiscoverPage } from "@/lib/discover";
import { DiscoveryPageHeader } from "./discovery-page-header";

interface Props {
  kind: MediaKind;
  initial: DiscoverPage;
}

export function DiscoverGrid({ kind, initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const genreOptions = genresFor(kind).map((g) => ({ value: g, label: g }));
  const yearOptions = browseYears().map((y) => ({ value: String(y), label: String(y) }));
  const providerOptions = STREAMING_PROVIDERS.map((p) => ({
    value: p.slug,
    label: p.name,
    iconUrl: providerLogoUrl(p),
  }));

  const genre = params.get("genre");
  const year = params.get("year");
  const provider = params.get("provider");
  const sortParam = params.get("sort") ?? "popular";
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";

  const [items, setItems] = useState(initial.results);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The server already rendered page 1 for the current filters, so skip the
  // duplicate fetch on mount and only refetch when a filter actually changes.
  const hydrated = useRef(false);

  const queryFor = useCallback(
    (nextPage: number) => {
      const q = new URLSearchParams({ kind, sort, page: String(nextPage) });
      if (genre) q.set("genre", genre);
      if (year) q.set("year", year);
      if (provider) q.set("provider", provider);
      return q.toString();
    },
    [kind, sort, genre, year, provider]
  );

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/discover?${queryFor(1)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: DiscoverPage) => {
        setItems(data.results ?? []);
        setTotalPages(data.totalPages ?? 0);
        setPage(1);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryFor]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  const loadMore = useCallback(async () => {
    // The sentinel is always mounted, so guard on `loading` too — otherwise a
    // filter change (which empties the grid and pulls the sentinel up into view)
    // would fire a page-2 fetch against the outgoing filter set.
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/discover?${queryFor(page + 1)}`);
      const data: DiscoverPage = await res.json();
      // De-dupe: TMDB pages can overlap when popularity shifts between requests.
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...(data.results ?? []).filter((i) => !seen.has(i.id))];
      });
      setPage(data.page ?? page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, page, totalPages, queryFor]);

  // Infinite scroll: a sentinel below the grid triggers the next page while it
  // is still 400px off-screen, so new rows are already in place by the time the
  // user reaches them.
  //
  // The observer is created ONCE and reads loadMore through a ref. Rebuilding it
  // whenever loadMore's identity changed (i.e. on every loading flip) meant the
  // fresh observer only reported *changes* in intersection — and since the
  // sentinel never left the viewport on a short page, it never fired again and
  // loading stalled after page 2.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A short page can leave the sentinel permanently on-screen, so intersection
  // never re-fires after a batch lands. Re-check once each batch settles.
  useEffect(() => {
    if (loading || loadingMore || page >= totalPages) return;
    const el = sentinelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + 400) void loadMoreRef.current();
  }, [items.length, loading, loadingMore, page, totalPages]);

  function surpriseMe() {
    if (items.length === 0) return;
    const pick = items[Math.floor(Math.random() * items.length)];
    router.push(`/title/${pick.type}/${pick.source}/${pick.tmdbId ?? pick.id}`);
  }

  const hasFilters = Boolean(genre || year || provider) || sort !== "popular";

  return (
    <div className="space-y-6">
      <DiscoveryPageHeader title={kind === "movie" ? "Movies" : "TV Shows"} description={`Discover ${kind === "movie" ? "films" : "series"} by genre, year, popularity, and streaming provider.`} actions={<div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={surpriseMe}
            aria-label="Surprise me"
            title="Surprise me"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Shuffle className="size-4" />
          </button>
          <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}><Dialog.Trigger asChild><button type="button" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-xs font-bold text-[#08090d] md:hidden"><SlidersHorizontal className="size-4" /> Filters{hasFilters ? " · Active" : ""}</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-[28px] border-t border-[rgb(var(--accent-rgb)/0.35)] bg-[var(--bg-elevated)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl"><div className="mb-5 flex items-center justify-between"><Dialog.Title className="font-display text-xl font-bold">Filters</Dialog.Title><div className="flex items-center gap-3">{hasFilters && <button type="button" onClick={() => router.replace("?", { scroll: false })} className="text-xs font-semibold text-[var(--text-muted)]">Clear all</button>}<Dialog.Close className="grid size-9 place-items-center rounded-full bg-[var(--glass)]"><X className="size-4" /></Dialog.Close></div></div><section className="space-y-3"><p className="text-xs font-bold text-[var(--text-secondary)]">Content</p><span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-black">{kind === "movie" ? "Movies" : "TV Shows"}</span></section><section className="mt-5 space-y-3"><p className="text-xs font-bold text-[var(--text-secondary)]">Genres</p><div className="flex flex-wrap gap-2">{genreOptions.map((option) => <button key={option.value} type="button" onClick={() => setParam("genre", genre === option.value ? null : option.value)} className={`rounded-full px-3 py-2 text-xs font-semibold ${genre === option.value ? "bg-white text-black" : "bg-[var(--glass)] text-[var(--text-secondary)]"}`}>{option.label}</button>)}</div></section><div className="mt-5 grid gap-4"><label className="space-y-2 text-xs font-bold text-[var(--text-secondary)]">Sort by<select value={sort} onChange={(event) => setParam("sort", event.target.value === "popular" ? null : event.target.value)} className="block h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)]">{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="space-y-2 text-xs font-bold text-[var(--text-secondary)]">Year<select value={year ?? ""} onChange={(event) => setParam("year", event.target.value || null)} className="block h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)]"><option value="">All years</option>{yearOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="space-y-2 text-xs font-bold text-[var(--text-secondary)]">Provider<select value={provider ?? ""} onChange={(event) => setParam("provider", event.target.value || null)} className="block h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)]"><option value="">All providers</option>{providerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div><Dialog.Close className="mt-6 h-12 w-full rounded-xl bg-white text-sm font-bold text-black">Show results</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
          <FilterDropdown
            allLabel="All Genres"
            options={genreOptions}
            value={genre}
            onChange={(v) => setParam("genre", v)}
          />
          <FilterDropdown
            allLabel="All Years"
            options={yearOptions}
            value={year}
            onChange={(v) => setParam("year", v)}
          />
          <FilterDropdown
            allLabel="Popular"
            showDot
            options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={sort === "popular" ? null : sort}
            onChange={(v) => setParam("sort", v)}
          />
          <FilterDropdown
            allLabel="All Providers"
            options={providerOptions}
            value={provider}
            onChange={(v) => setParam("provider", v)}
          />

          {hasFilters && (
            <button
              type="button"
              onClick={() => router.replace("?", { scroll: false })}
              className="rounded-full px-3 py-2 text-xs font-semibold text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
            >
              Reset
            </button>
          )}
          </div>
        </div>} />

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
          Nothing matches these filters. Try widening them.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => (
            <PosterCard key={item.id} item={item} />
          ))}
          {/* Skeletons occupy the incoming row so the grid never jumps. */}
          {loadingMore && Array.from({ length: 6 }).map((_, i) => <PosterSkeleton key={`sk-${i}`} />)}
        </div>
      )}

      {/* Sentinel stays mounted for the component's whole life so the single
          IntersectionObserver never loses its target between filter changes. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      <span className="sr-only" role="status" aria-live="polite">
        {loadingMore ? "Loading more titles" : ""}
      </span>

      {!loading && page >= totalPages && items.length > 20 && (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
