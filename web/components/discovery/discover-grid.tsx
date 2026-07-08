"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shuffle, Loader2 } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
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
import { cn } from "@/lib/utils";

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
  loadMoreRef.current = loadMore;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {kind === "movie" ? "Movies" : "Shows"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Discover new {kind === "movie" ? "movies" : "shows"} to watch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={surpriseMe}
            aria-label="Surprise me"
            title="Surprise me"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Shuffle className="size-4" />
          </button>

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
      </div>

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

      {!loading && items.length > 0 && page < totalPages && (
        <div className="flex justify-center py-4" role="status" aria-live="polite">
          <Loader2
            className={cn(
              "size-5 animate-spin text-[var(--accent)] transition-opacity",
              loadingMore ? "opacity-100" : "opacity-0"
            )}
          />
          <span className="sr-only">{loadingMore ? "Loading more titles" : ""}</span>
        </div>
      )}

      {!loading && page >= totalPages && items.length > 20 && (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
