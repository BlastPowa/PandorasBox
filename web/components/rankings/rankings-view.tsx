"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus, Trophy, Search, Star, Crown, Library } from "lucide-react";
import type { ReelItemType } from "@core/storage/schema";
import { getStatusLabel } from "@core/utils/formatters";
import { useLibrary } from "@/lib/library/use-library";
import {
  listRankings,
  addToRanking,
  removeFromRanking,
  swapRankingPositions,
  type RankingEntry,
} from "@/lib/rankings/rankings";
import { Pill } from "@/components/ui-fx/badge";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";

/** item_id is always "{source}-{rawId}"; split on the FIRST hyphen only since
 *  MangaDex raw ids are UUIDs that themselves contain hyphens. */
function detailHref(category: ReelItemType, itemId: string): string {
  const idx = itemId.indexOf("-");
  const source = idx === -1 ? itemId : itemId.slice(0, idx);
  const refId = idx === -1 ? "" : itemId.slice(idx + 1);
  if (category === "comic") return `/comic/${refId}`;
  return `/title/${category}/${source}/${refId}`;
}

const CATEGORIES: { key: ReelItemType; label: string }[] = [
  { key: "movie", label: "Movies" },
  { key: "series", label: "TV Series" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Manga" },
  { key: "manhwa", label: "Manhwa" },
  { key: "comic", label: "Comics" },
];

export function RankingsView() {
  const { items, signedIn } = useLibrary();
  const [category, setCategory] = useState<ReelItemType>("anime");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRankings(await listRankings(category));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void listRankings(category)
      .then((nextRankings) => {
        if (!cancelled) setRankings(nextRankings);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load rankings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, signedIn]);

  const rankedIds = useMemo(() => new Set(rankings.map((r) => r.item_id)), [rankings]);
  const categoryItems = useMemo(() => items.filter((item) => item.type === category), [items, category]);
  const libraryById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<ReelItemType, number>();
    for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    return counts;
  }, [items]);
  const candidates = useMemo(() => {
    const query = pickerQuery.trim().toLocaleLowerCase();
    return categoryItems
      .filter((item) => !rankedIds.has(item.id))
      .filter((item) => !query || item.title.toLocaleLowerCase().includes(query))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title));
  }, [categoryItems, pickerQuery, rankedIds]);

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= rankings.length) return;
    const a = rankings[index];
    const b = rankings[other];
    // swap in local state immediately for snappy UI, matching the underlying position swap
    const reordered = rankings.slice();
    [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
    setRankings(reordered);
    try {
      await swapRankingPositions(a, b);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
      void load();
    }
  }

  async function addItem(itemId: string, title: string, posterUrl: string | null) {
    try {
      await addToRanking(category, itemId, title, posterUrl);
      toast.success(`Added to your Top ${CATEGORIES.find((c) => c.key === category)?.label}`);
      setPickerQuery("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add");
    }
  }

  async function remove(id: string) {
    try {
      await removeFromRanking(id);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  if (!signedIn) {
    return (
      <EmptyState
        icon={<Trophy className="size-10" />}
        title="Rank your favorites"
        description="Sign in to build your own ordered Top Anime, Top Movies and Top TV lists — separate from your 5-star ratings."
        action={<Button asChild><Link href="/login?next=/rankings">Sign in</Link></Button>}
      />
    );
  }

  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label ?? "titles";

  function rankActions(entry: RankingEntry, index: number) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${entry.title} up`}
          onClick={() => void move(index, -1)}
          disabled={index === 0}
          className="grid size-8 place-items-center rounded-[8px] text-[var(--text-secondary)] transition hover:bg-[var(--glass-strong)] disabled:opacity-30"
        >
          <ArrowUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${entry.title} down`}
          onClick={() => void move(index, 1)}
          disabled={index === rankings.length - 1}
          className="grid size-8 place-items-center rounded-[8px] text-[var(--text-secondary)] transition hover:bg-[var(--glass-strong)] disabled:opacity-30"
        >
          <ArrowDown className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Remove ${entry.title} from rankings`}
          onClick={() => void remove(entry.id)}
          className="grid size-8 place-items-center rounded-[8px] text-[var(--dropped)] transition hover:bg-[var(--glass-strong)]"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Ranking categories">
        {CATEGORIES.map((c) => (
          <Pill
            key={c.key}
            active={category === c.key}
            onClick={() => {
              setCategory(c.key);
              setPickerOpen(false);
              setPickerQuery("");
            }}
          >
            {c.label} <span className="ml-1 opacity-70">{categoryCounts.get(c.key) ?? 0}</span>
          </Pill>
        ))}
      </div>

      <div className="pb-uiverse-card pb-aura overflow-hidden rounded-[var(--radius-xl)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
              <Crown className="size-4" /> Personal taste list
            </div>
            <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">Top {categoryLabel}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Rank the titles you would recommend first. Your library rating and status stay visible as context while you order them.
            </p>
          </div>
          <Button size="sm" onClick={() => setPickerOpen((value) => !value)}>
            <Plus className="size-4" /> {pickerOpen ? "Close picker" : "Add title"}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="pb-uiverse-row rounded-xl px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Ranked</p>
            <p className="mt-1 font-display text-xl font-bold">{rankings.length}</p>
          </div>
          <div className="pb-uiverse-row rounded-xl px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">In library</p>
            <p className="mt-1 font-display text-xl font-bold">{categoryItems.length}</p>
          </div>
          <div className="pb-uiverse-row col-span-2 rounded-xl px-3 py-3 sm:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Still unranked</p>
            <p className="mt-1 font-display text-xl font-bold">{Math.max(categoryItems.length - rankings.length, 0)}</p>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <div className="pb-uiverse-card pb-uiverse-card--compact rounded-[var(--radius-md)] p-3 sm:p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
              placeholder={`Search your ${categoryLabel.toLowerCase()} library`}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.16)]"
            />
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {pickerQuery.trim()
                ? `No unranked ${categoryLabel.toLowerCase()} match “${pickerQuery.trim()}”.`
                : `Nothing to add — every ${categoryLabel.toLowerCase()} title in your library is already ranked, or your library has none of this type yet.`}
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => void addItem(c.id, c.title, c.posterUrl)}
                className="flex w-full items-center gap-3 rounded-[8px] p-2 text-left hover:bg-[var(--glass-strong)]"
              >
                <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-[4px] bg-[var(--bg-elevated)]">
                  {c.posterUrl && <Image src={c.posterUrl} alt="" fill sizes="32px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                    {c.year && <span>{c.year}</span>}
                    <span>{getStatusLabel(c.status)}</span>
                    {c.rating !== null && (
                      <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                        <Star className="size-3 fill-current" /> {c.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <Plus className="size-4 shrink-0 text-[var(--accent)]" />
              </button>
            ))
          )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />
      ) : rankings.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-10" />}
          title="No rankings yet"
          description="Click 'Add title' to start ranking the titles in your library."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {rankings.slice(0, 3).map((entry, index) => {
              const libraryItem = libraryById.get(entry.item_id);
              return (
                <article key={entry.id} className="pb-uiverse-card pb-aura overflow-hidden rounded-[20px] p-3">
                  <div className="flex items-start gap-3">
                    <Link
                      href={detailHref(entry.category, entry.item_id)}
                      className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-elevated)]"
                    >
                      {entry.poster_url && <Image src={entry.poster_url} alt="" fill sizes="80px" className="object-cover" />}
                      <span className="absolute left-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-[rgba(8,8,12,0.76)] font-display text-sm font-black text-white backdrop-blur">
                        {index + 1}
                      </span>
                    </Link>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">
                        {index === 0 ? "Your #1" : `Rank ${index + 1}`}
                      </p>
                      <Link href={detailHref(entry.category, entry.item_id)} className="mt-1 line-clamp-2 text-sm font-bold hover:text-[var(--accent)]">
                        {entry.title}
                      </Link>
                      {libraryItem && (
                        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                          {libraryItem.year && <span>{libraryItem.year}</span>}
                          <span>{getStatusLabel(libraryItem.status)}</span>
                          {libraryItem.rating !== null && <span>{libraryItem.rating.toFixed(1)} ★</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                      {index === 0 ? <Crown className="size-3.5 text-[var(--accent)]" /> : <Library className="size-3.5" />}
                      {index === 0 ? "Current favourite" : "Personal ranking"}
                    </span>
                    {rankActions(entry, index)}
                  </div>
                </article>
              );
            })}
          </div>

          {rankings.length > 3 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">The rest of your list</h3>
                <span className="text-xs text-[var(--text-muted)]">{rankings.length - 3} more</span>
              </div>
              {rankings.slice(3).map((entry, relativeIndex) => {
                const index = relativeIndex + 3;
                const libraryItem = libraryById.get(entry.item_id);
                return (
                  <div key={entry.id} className="pb-uiverse-row flex items-center gap-3 rounded-[var(--radius-md)] p-2.5">
                    <span className="w-7 shrink-0 text-center font-display text-lg font-bold text-[var(--accent)]">{index + 1}</span>
                    <Link href={detailHref(entry.category, entry.item_id)} className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-elevated)]">
                      {entry.poster_url && <Image src={entry.poster_url} alt="" fill sizes="40px" className="object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={detailHref(entry.category, entry.item_id)} className="block truncate text-sm font-semibold hover:text-[var(--accent)]">{entry.title}</Link>
                      {libraryItem && (
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                          {[libraryItem.year, getStatusLabel(libraryItem.status), libraryItem.rating !== null ? `${libraryItem.rating.toFixed(1)} ★` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    {rankActions(entry, index)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
