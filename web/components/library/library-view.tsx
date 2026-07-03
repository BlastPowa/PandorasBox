"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, BarChart3, SlidersHorizontal, Trash2, Check } from "lucide-react";
import type { ReelItem, ReelItemStatus, ReelItemType } from "@core/storage/schema";
import { formatProgress, getStatusLabel } from "@core/utils/formatters";
import { useLibrary, useLibraryStats } from "@/lib/library/use-library";
import { RatingStars } from "@/components/ui-fx/rating-stars";
import { Pill, TypeBadge, StatusBadge } from "@/components/ui-fx/badge";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";

const STATUS_TABS: { key: ReelItemStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watching", label: "Watching" },
  { key: "reading", label: "Reading" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "planned", label: "Planned" },
  { key: "dropped", label: "Dropped" },
];

const TYPE_TABS: { key: ReelItemType | "all"; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "TV" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Manga" },
  { key: "manhwa", label: "Manhwa" },
];

type SortKey = "title" | "score" | "progress" | "updated";

export function LibraryView() {
  const { items, loading, signedIn, remove, markEpisode, markChapter, markComplete, setRating } = useLibrary();
  const stats = useLibraryStats(items);
  const [status, setStatus] = useState<ReelItemStatus | "all">("all");
  const [type, setType] = useState<ReelItemType | "all">("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (status !== "all") list = list.filter((i) => i.status === status);
    if (type !== "all") list = list.filter((i) => i.type === type);
    list.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "score":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "progress":
          return b.progress.percentComplete - a.progress.percentComplete;
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return list;
  }, [items, status, type, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  if (!signedIn) {
    return (
      <EmptyState
        icon={<Plus className="size-10" />}
        title="Your library lives here"
        description="Sign in to track movies, TV, anime, manga and manhwa — with status, progress and ratings synced across devices."
        action={
          <Button asChild>
            <Link href="/login?next=/library">Sign in</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.totalItems} />
        <StatCard label="Watching" value={stats.watching} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Hours" value={Math.round(stats.totalWatchTimeMinutes / 60)} />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_TABS.map((t) => (
          <Pill key={t.key} active={status === t.key} onClick={() => setStatus(t.key)}>
            {t.label}
            {counts[t.key] ? <span className="ml-1.5 opacity-60">{counts[t.key]}</span> : null}
          </Pill>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/stats" className="glass inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]">
          <BarChart3 className="size-4" /> Stats
        </Link>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="glass inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]"
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="glass space-y-3 rounded-[var(--radius-md)] p-3">
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((t) => (
              <Pill key={t.key} active={type === t.key} onClick={() => setType(t.key)}>{t.label}</Pill>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">Sort:</span>
            {(["updated", "title", "score", "progress"] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={sort === s ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}
              >
                {s === "updated" ? "Recent" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Plus className="size-10" />}
          title="Nothing here yet"
          description="Browse or search, then add titles to this list."
          action={<Button asChild variant="glass"><Link href="/browse">Browse</Link></Button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] md:block">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-surface)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="w-10 px-3 py-3">#</th>
                  <th className="w-14 px-2 py-3">Cover</th>
                  <th className="px-2 py-3">Title</th>
                  <th className="w-40 px-2 py-3">Score</th>
                  <th className="w-24 px-2 py-3">Type</th>
                  <th className="w-40 px-2 py-3">Progress</th>
                  <th className="w-28 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <LibraryRow key={item.id} item={item} index={idx + 1}
                    onRate={(v) => void setRating(item.id, v)}
                    onNext={() => void advance(item, markEpisode, markChapter)}
                    onComplete={() => void markComplete(item.id)}
                    onRemove={() => void remove(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((item) => (
              <LibraryCard key={item.id} item={item}
                onRate={(v) => void setRating(item.id, v)}
                onNext={() => void advance(item, markEpisode, markChapter)}
                onRemove={() => void remove(item.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function advance(
  item: ReelItem,
  markEpisode: (id: string, ep: number) => Promise<void>,
  markChapter: (id: string, ch: number) => Promise<void>
) {
  if (item.type === "manga" || item.type === "manhwa") {
    return markChapter(item.id, (item.progress.currentChapter ?? 0) + 1);
  }
  return markEpisode(item.id, (item.progress.currentEpisode ?? 0) + 1);
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-[var(--radius-md)] px-4 py-3">
      <div className="font-mono text-2xl font-bold text-gradient">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function LibraryRow({ item, index, onRate, onNext, onComplete, onRemove }: {
  item: ReelItem; index: number;
  onRate: (v: number) => void; onNext: () => void; onComplete: () => void; onRemove: () => void;
}) {
  const href = `/title/${item.type}/${item.source}/${item.anilistId ?? item.tmdbId ?? item.mangadexId}`;
  return (
    <tr className="border-t border-[var(--border)] transition-colors hover:bg-[var(--glass)]">
      <td className="px-3 py-2 font-mono text-xs text-[var(--text-muted)]">{index}</td>
      <td className="px-2 py-2">
        <Link href={href} className="relative block h-14 w-10 overflow-hidden rounded-[6px] bg-[var(--bg-elevated)]">
          {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="40px" className="object-cover" />}
        </Link>
      </td>
      <td className="px-2 py-2">
        <Link href={href} className="font-semibold hover:text-[var(--accent)]">{item.title}</Link>
        <div className="mt-0.5"><StatusBadge status={item.status} /></div>
      </td>
      <td className="px-2 py-2"><RatingStars value={item.rating} onChange={onRate} size={14} /></td>
      <td className="px-2 py-2"><TypeBadge type={item.type} /></td>
      <td className="px-2 py-2 font-mono text-xs text-[var(--text-secondary)]">{formatProgress(item.progress, item.type)}</td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onNext} title="Mark next" className="rounded-md p-1.5 text-[var(--accent)] hover:bg-[var(--glass)]"><Plus className="size-4" /></button>
          <button onClick={onComplete} title="Complete" className="rounded-md p-1.5 text-[var(--completed)] hover:bg-[var(--glass)]"><Check className="size-4" /></button>
          <button onClick={onRemove} title="Remove" className="rounded-md p-1.5 text-[var(--dropped)] hover:bg-[var(--glass)]"><Trash2 className="size-4" /></button>
        </div>
      </td>
    </tr>
  );
}

function LibraryCard({ item, onRate, onNext, onRemove }: {
  item: ReelItem; onRate: (v: number) => void; onNext: () => void; onRemove: () => void;
}) {
  const href = `/title/${item.type}/${item.source}/${item.anilistId ?? item.tmdbId ?? item.mangadexId}`;
  return (
    <div className="glass flex gap-3 rounded-[var(--radius-md)] p-2.5">
      <Link href={href} className="relative h-20 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[var(--bg-elevated)]">
        {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="56px" className="object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="line-clamp-1 font-semibold">{item.title}</Link>
        <div className="mt-1 flex items-center gap-2"><TypeBadge type={item.type} /><StatusBadge status={item.status} /></div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">{formatProgress(item.progress, item.type)}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <RatingStars value={item.rating} onChange={onRate} size={14} />
          <div className="flex gap-1">
            <button onClick={onNext} className="rounded-md p-1.5 text-[var(--accent)]"><Plus className="size-4" /></button>
            <button onClick={onRemove} className="rounded-md p-1.5 text-[var(--dropped)]"><Trash2 className="size-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
