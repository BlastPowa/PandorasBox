"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { Pill } from "@/components/ui-fx/badge";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { ArrowRight, CalendarDays, ListOrdered, SearchX, Layers3, Star, ScanSearch } from "lucide-react";

const FILTERS: { key: ReelItemType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "TV & Series" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Manga" },
  { key: "manhwa", label: "Manhwa" },
  { key: "comic", label: "Comics" },
];

type SearchOrder = "relevance" | "release-asc" | "release-desc";
type FranchiseOrder = "release" | "chronological";

export interface SearchFranchiseContext {
  slug: string;
  name: string;
  description: string;
  releaseItems: UnifiedSearchResult[];
  chronologicalItems: UnifiedSearchResult[];
  hasCuratedChronology: boolean;
}

export function FilterableGrid({
  items,
  franchise = null,
  query,
}: {
  items: UnifiedSearchResult[];
  franchise?: SearchFranchiseContext | null;
  query?: string;
}) {
  const [filter, setFilter] = useState<ReelItemType | "all">("all");
  const [order, setOrder] = useState<SearchOrder>("relevance");
  const [franchiseOrder, setFranchiseOrder] = useState<FranchiseOrder>("release");
  const filtered = useMemo(() => {
    const next = filter === "all" ? [...items] : items.filter((i) => i.type === filter);
    if (order === "release-asc") {
      next.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    } else if (order === "release-desc") {
      next.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
    }
    return next;
  }, [filter, items, order]);
  const franchiseItems = franchiseOrder === "chronological"
    ? franchise?.chronologicalItems ?? []
    : franchise?.releaseItems ?? [];
  const counts = useMemo(() => {
    const next = new Map<ReelItemType | "all", number>([["all", items.length]]);
    for (const item of items) next.set(item.type, (next.get(item.type) ?? 0) + 1);
    return next;
  }, [items]);
  const resultContext = useMemo(() => {
    const years = items.flatMap((item) => item.year === null ? [] : [item.year]);
    const rated = items.filter((item) => item.score !== null).length;
    const representedTypes = FILTERS.slice(1).filter((entry) => (counts.get(entry.key) ?? 0) > 0).length;
    return {
      earliestYear: years.length > 0 ? Math.min(...years) : null,
      latestYear: years.length > 0 ? Math.max(...years) : null,
      rated,
      representedTypes,
    };
  }, [counts, items]);

  return (
    <div className="space-y-5">
      <section className="pb-uiverse-card pb-aura rounded-[var(--radius-xl)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
              <ScanSearch className="size-4" /> Result context
            </div>
            <h2 className="mt-1 font-display text-xl font-extrabold">
              {query ? <>&ldquo;{query}&rdquo;</> : "Search results"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Showing {filtered.length} of {items.length} matches across {resultContext.representedTypes} media {resultContext.representedTypes === 1 ? "type" : "types"}.
            </p>
          </div>
          <p className="text-xs font-semibold text-[var(--text-muted)]">Filter and reorder without leaving the results.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="pb-uiverse-row rounded-xl px-3 py-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]"><Layers3 className="size-3.5" /> Matches</span>
            <p className="mt-1 font-display text-xl font-bold">{items.length}</p>
          </div>
          <div className="pb-uiverse-row rounded-xl px-3 py-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]"><Star className="size-3.5" /> Scored</span>
            <p className="mt-1 font-display text-xl font-bold">{resultContext.rated}</p>
          </div>
          <div className="pb-uiverse-row col-span-2 rounded-xl px-3 py-3 sm:col-span-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]"><CalendarDays className="size-3.5" /> Release span</span>
            <p className="mt-1 font-display text-xl font-bold">
              {resultContext.earliestYear === null
                ? "Unknown"
                : resultContext.earliestYear === resultContext.latestYear
                  ? resultContext.earliestYear
                  : `${resultContext.earliestYear}–${resultContext.latestYear}`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label} <span className="ml-1 opacity-70">{counts.get(f.key) ?? 0}</span>
            </Pill>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <CalendarDays className="size-3.5" /> Order
          </span>
          <Pill active={order === "relevance"} onClick={() => setOrder("relevance")}>Relevance</Pill>
          <Pill active={order === "release-asc"} onClick={() => setOrder("release-asc")}>Oldest first</Pill>
          <Pill active={order === "release-desc"} onClick={() => setOrder("release-desc")}>Newest first</Pill>
        </div>
      </section>

      {franchise && franchise.releaseItems.length > 1 && (
        <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--media-border)] bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.13),transparent_46%),var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                <ListOrdered className="size-4" /> Franchise match
              </div>
              <h2 className="font-display text-2xl font-extrabold">{franchise.name}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{franchise.description}</p>
            </div>
            <Link href={`/browse/franchise/${franchise.slug}`} className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--accent)] hover:underline">
              Open franchise <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Pill active={franchiseOrder === "release"} onClick={() => setFranchiseOrder("release")}>Release order</Pill>
            {franchise.hasCuratedChronology && (
              <Pill active={franchiseOrder === "chronological"} onClick={() => setFranchiseOrder("chronological")}>Chronological order</Pill>
            )}
          </div>
          <PosterGrid items={franchiseItems} />
        </section>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-10" />}
          title="No results"
          description="Try a different title or filter. Anime & manga work without setup; movies and TV need a TMDB key."
        />
      ) : (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">Browse matches</p>
              <h3 className="mt-0.5 font-display text-lg font-bold">{filter === "all" ? "All media" : FILTERS.find((entry) => entry.key === filter)?.label}</h3>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">{filtered.length} shown</span>
          </div>
          <PosterGrid items={filtered} />
        </section>
      )}
    </div>
  );
}
