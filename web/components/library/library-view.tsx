"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Plus, BarChart3, SlidersHorizontal, Trash2, Check, CheckSquare, ListChecks, X, Search, Sparkles, Library, PlayCircle, CircleCheckBig, Clock3, ArrowRight } from "lucide-react";
import type { ReelItem, ReelItemStatus, ReelItemType } from "@core/storage/schema";
import { formatProgress } from "@core/utils/formatters";
import { useLibrary, useLibraryStats } from "@/lib/library/use-library";
import { RatingStars } from "@/components/ui-fx/rating-stars";
import { Pill, TypeBadge, StatusBadge } from "@/components/ui-fx/badge";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";
import { BulkAddToCollection } from "@/components/collections/bulk-add-to-collection";
import type { AddToCollectionItem } from "@/components/collections/add-to-collection";
import { libraryItemHref } from "@/lib/library/item-href";

const STATUS_TABS: { key: ReelItemStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watching", label: "Watching" },
  { key: "rewatching", label: "Rewatching" },
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
  { key: "comic", label: "Comics" },
];

type SortKey = "title" | "score" | "progress" | "updated";
type SmartView = "all" | "in_progress" | "untouched" | "nearly_done";

const SMART_VIEWS: { key: SmartView; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "in_progress", label: "In progress" },
  { key: "untouched", label: "Untouched" },
  { key: "nearly_done", label: "Nearly done" },
];

export function LibraryView() {
  const { items, loading, signedIn, remove, markEpisode, markChapter, markComplete, setRating } = useLibrary();
  const stats = useLibraryStats(items);
  const [status, setStatus] = useState<ReelItemStatus | "all">("all");
  const [type, setType] = useState<ReelItemType | "all">("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [smartView, setSmartView] = useState<SmartView>("all");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  async function removeFromLibrary(item: ReelItem) {
    if (removing.has(item.id)) return;
    setRemoving((current) => new Set(current).add(item.id));
    try {
      await remove(item.id);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      toast.success(`${item.title} removed from your library`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this library item");
    } finally {
      setRemoving((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const filtered = useMemo(() => {
    let list = items.slice();
    const normalisedQuery = query.trim().toLowerCase();
    if (normalisedQuery) list = list.filter((i) => i.title.toLowerCase().includes(normalisedQuery));
    if (status !== "all") list = list.filter((i) => i.status === status);
    if (type !== "all") list = list.filter((i) => i.type === type);
    if (smartView === "in_progress") list = list.filter((i) => i.progress.percentComplete > 0 && i.progress.percentComplete < 100);
    if (smartView === "untouched") list = list.filter((i) => i.progress.percentComplete <= 0 && i.status !== "completed");
    if (smartView === "nearly_done") list = list.filter((i) => i.progress.percentComplete >= 75 && i.progress.percentComplete < 100);
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
  }, [items, query, status, type, smartView, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const libraryPulse = useMemo(() => {
    const inProgress = items
      .filter((item) => item.progress.percentComplete > 0 && item.progress.percentComplete < 100)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      resume: inProgress[0] ?? null,
      nearlyDone: inProgress.filter((item) => item.progress.percentComplete >= 75).length,
      untouched: items.filter((item) => item.progress.percentComplete <= 0 && item.status !== "completed").length,
    };
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
        <StatCard label="Total" value={stats.totalItems} icon={<Library className="size-4" />} />
        <StatCard label="Watching" value={stats.watching} icon={<PlayCircle className="size-4" />} />
        <StatCard label="Completed" value={stats.completed} icon={<CircleCheckBig className="size-4" />} />
        <StatCard label="Hours" value={Math.round(stats.totalWatchTimeMinutes / 60)} icon={<Clock3 className="size-4" />} />
      </div>

      {items.length > 0 && (
        <section className="pb-uiverse-card pb-uiverse-card--compact overflow-hidden rounded-[22px] p-3 sm:p-4" aria-label="Library pulse">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]"><Sparkles className="size-3.5" /> Library pulse</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Quick ways back into what you are tracking.</p>
            </div>
            <Link href="/schedule" className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)] sm:inline-flex">
              Release calendar <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {libraryPulse.resume ? (
              <Link href={libraryItemHref(libraryPulse.resume)} className="group rounded-[16px] border border-[var(--border)] bg-[var(--bg-base)] px-3.5 py-3 transition hover:border-[rgb(var(--accent-rgb)/0.34)] hover:bg-[rgb(var(--accent-rgb)/0.05)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Continue</span>
                <strong className="mt-1 block truncate text-sm text-[var(--text)] group-hover:text-[var(--accent)]">{libraryPulse.resume.title}</strong>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">{Math.round(libraryPulse.resume.progress.percentComplete)}% complete</span>
              </Link>
            ) : (
              <button type="button" onClick={() => setSmartView("untouched")} className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-base)] px-3.5 py-3 text-left transition hover:border-[rgb(var(--accent-rgb)/0.34)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Start something</span>
                <strong className="mt-1 block text-sm">Open your untouched titles</strong>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">{libraryPulse.untouched} waiting</span>
              </button>
            )}
            <button type="button" onClick={() => setSmartView("nearly_done")} className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-base)] px-3.5 py-3 text-left transition hover:border-[rgb(var(--accent-rgb)/0.34)] hover:bg-[rgb(var(--accent-rgb)/0.05)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Finish line</span>
              <strong className="mt-1 block text-sm">{libraryPulse.nearlyDone} nearly finished</strong>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">Jump to titles at 75% or more</span>
            </button>
            <button type="button" onClick={() => setSmartView("untouched")} className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-base)] px-3.5 py-3 text-left transition hover:border-[rgb(var(--accent-rgb)/0.34)] hover:bg-[rgb(var(--accent-rgb)/0.05)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Backlog</span>
              <strong className="mt-1 block text-sm">{libraryPulse.untouched} untouched</strong>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">Pick from titles you have not started</span>
            </button>
          </div>
        </section>
      )}

      <div className="pb-uiverse-card pb-uiverse-card--compact rounded-[22px] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your library"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] pl-9 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.12)]"
            />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/stats" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]">
              <BarChart3 className="size-4" /> Stats
            </Link>
          <button
            onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-xs font-semibold transition ${selectMode ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"}`}
          >
            <CheckSquare className="size-4" /> {selectMode ? "Done" : "Select"}
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-xs font-semibold transition ${showFilters ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.08)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"}`}
          >
            <SlidersHorizontal className="size-4" /> Filters
          </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-[var(--border)] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <Sparkles className="size-3.5" /> Smart views
          </span>
          {SMART_VIEWS.map((view) => (
            <button
              key={view.key}
              onClick={() => setSmartView(view.key)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${smartView === view.key ? "bg-[rgb(var(--accent-rgb)/0.10)] text-[var(--accent)] ring-1 ring-[rgb(var(--accent-rgb)/0.20)]" : "bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text)]"}`}
            >
              {view.label}
            </button>
          ))}
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--text-muted)]">
        <span><strong className="font-semibold text-[var(--text)]">{filtered.length}</strong> of {items.length} titles</span>
        {(query || status !== "all" || type !== "all" || smartView !== "all") && (
          <button
            type="button"
            onClick={() => { setQuery(""); setStatus("all"); setType("all"); setSmartView("all"); }}
            className="font-semibold text-[var(--accent)] transition hover:opacity-75"
          >
            Clear filters
          </button>
        )}
      </div>

      {selectMode && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)]/95 p-2.5 backdrop-blur-xl">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <BulkAddToCollection
                items={filtered.filter((i) => selected.has(i.id)).map(toCollectionItem)}
                onDone={() => { setSelected(new Set()); setSelectMode(false); }}
              />
            )}
            <button
              onClick={() => setSelected(new Set(filtered.map((i) => i.id)))}
              className="glass rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Select all
            </button>
            <button
              onClick={() => { setSelected(new Set()); setSelectMode(false); }}
              className="glass grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)]"
              aria-label="Cancel selection"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

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
          description={query || status !== "all" || type !== "all" || smartView !== "all" ? "No titles match these library filters." : "Browse or search, then add titles to this list."}
          action={<Button asChild variant="glass"><Link href="/browse">Browse</Link></Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <LibraryCard key={item.id} item={item}
              selectMode={selectMode}
              selected={selected.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onRate={(v) => void setRating(item.id, v)}
              onNext={() => void advance(item, markEpisode, markChapter)}
              onComplete={() => void markComplete(item.id)}
              removing={removing.has(item.id)}
              onRemove={() => void removeFromLibrary(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function toCollectionItem(i: ReelItem): AddToCollectionItem {
  return {
    id: i.id,
    type: i.type,
    source: i.source,
    title: i.title,
    posterUrl: i.posterUrl,
    year: i.year,
    anilistId: i.anilistId,
    tmdbId: i.tmdbId,
    mangadexId: i.mangadexId,
  };
}

function advance(
  item: ReelItem,
  markEpisode: (id: string, ep: number) => Promise<void>,
  markChapter: (id: string, ch: number) => Promise<void>
) {
  if (item.type === "manga" || item.type === "manhwa" || item.type === "comic") {
    return markChapter(item.id, (item.progress.currentChapter ?? 0) + 1);
  }
  return markEpisode(item.id, (item.progress.currentEpisode ?? 0) + 1);
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="pb-uiverse-card pb-uiverse-card--compact flex min-h-[82px] items-center justify-between gap-3 rounded-[18px] px-3.5 py-3 sm:px-4">
      <div>
        <div className="font-mono text-2xl font-bold text-gradient sm:text-[1.7rem]">{value}</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</div>
      </div>
      <span className="pb-uiverse-icon grid size-9 shrink-0 place-items-center rounded-xl text-[var(--accent)]">{icon}</span>
    </div>
  );
}

function LibraryCard({ item, selectMode, selected, removing, onToggleSelect, onRate, onNext, onComplete, onRemove }: {
  item: ReelItem; selectMode: boolean; selected: boolean; removing: boolean; onToggleSelect: () => void;
  onRate: (v: number) => void; onNext: () => void; onComplete: () => void; onRemove: () => void;
}) {
  const href = libraryItemHref(item);
  return (
    <article className={`pb-uiverse-media-card group relative isolate flex min-h-[166px] gap-3 overflow-hidden rounded-[22px] p-2.5 sm:min-h-[178px] sm:p-3 ${selected ? "ring-2 ring-[var(--accent)]" : ""}`}>
      {item.backdropUrl && <Image src={item.backdropUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="-z-20 object-cover opacity-[0.13] transition duration-500 group-hover:scale-[1.03] group-hover:opacity-[0.19]" />}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--bg-surface)_5%,color-mix(in_srgb,var(--bg-surface)_88%,transparent)_62%,color-mix(in_srgb,var(--bg-surface)_58%,transparent))]" />
      {selectMode && (
        <label className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="size-5 accent-[var(--accent)]" />
        </label>
      )}
      <Link href={href} className="pb-uiverse-media-card__poster relative h-[146px] w-[98px] shrink-0 overflow-hidden rounded-[14px] bg-[var(--bg-elevated)] sm:h-[154px] sm:w-[104px]">
        {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="104px" className="object-cover transition duration-500 group-hover:scale-105" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="pr-8">
          <Link href={href} className="line-clamp-2 font-display text-base font-bold leading-tight transition hover:text-[var(--accent)]">{item.title}</Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            {item.year && <span>{item.year}</span>}
            {item.genres.slice(0, 2).map((genre) => <span key={genre} className="rounded-full bg-[rgb(var(--accent-rgb)/0.08)] px-2 py-0.5 text-[var(--text-secondary)]">{genre}</span>)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2"><TypeBadge type={item.type} /><StatusBadge status={item.status} /></div>
        <div className="mt-3"><ProgressMeter item={item} compact /></div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-1.5 pt-2">
          <div className="max-w-full overflow-hidden"><RatingStars value={item.rating} onChange={onRate} size={14} /></div>
          <div className="flex gap-0.5 rounded-full border border-[var(--border)] bg-[var(--glass)] p-0.5 backdrop-blur-md">
            {item.type === "comic" ? <Link href={href} aria-label="Open issue tracker" title="Open issue tracker" className="rounded-full p-1.5 text-[var(--accent)] hover:bg-[var(--bg-elevated)]"><ListChecks className="size-4" /></Link> : <button onClick={onNext} aria-label="Mark next" title="Mark next" className="rounded-full p-1.5 text-[var(--accent)] hover:bg-[var(--bg-elevated)]"><Plus className="size-4" /></button>}
            <button onClick={onComplete} aria-label={`Mark ${item.title} complete`} title="Complete" className="rounded-full p-1.5 text-[var(--completed)] hover:bg-[var(--bg-elevated)]"><Check className="size-4" /></button>
            <button onClick={onRemove} disabled={removing} aria-label={`Remove ${item.title} from library`} title="Remove" className="rounded-full p-1.5 text-[var(--dropped)] hover:bg-[var(--bg-elevated)] disabled:cursor-wait disabled:opacity-40"><Trash2 className="size-4" /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProgressMeter({ item, compact = false }: { item: ReelItem; compact?: boolean }) {
  const percent = Math.max(0, Math.min(100, Math.round(item.progress.percentComplete || 0)));
  return (
    <div className={compact ? "space-y-1" : "min-w-[132px] space-y-1.5"}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <span className="truncate">{formatProgress(item.progress, item.type)}</span>
        <span className="shrink-0 font-mono font-semibold text-[var(--text)]">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)] shadow-[inset_0_1px_2px_rgba(0,0,0,.08)]" aria-label={`${item.title} ${percent}% complete`}>
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] shadow-[0_0_12px_rgb(var(--accent-rgb)/0.26)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
