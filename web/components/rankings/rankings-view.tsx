"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus, Trophy } from "lucide-react";
import type { ReelItemType } from "@core/storage/schema";
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
    if (signedIn) void load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, signedIn]);

  const rankedIds = useMemo(() => new Set(rankings.map((r) => r.item_id)), [rankings]);
  const candidates = useMemo(
    () => items.filter((i) => i.type === category && !rankedIds.has(i.id)),
    [items, category, rankedIds]
  );

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
      setPickerOpen(false);
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Pill key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>{c.label}</Pill>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Your personal Top {CATEGORIES.find((c) => c.key === category)?.label} — reorder with the arrows.
        </p>
        <Button size="sm" onClick={() => setPickerOpen((v) => !v)}>
          <Plus className="size-4" /> Add title
        </Button>
      </div>

      {pickerOpen && (
        <div className="glass max-h-72 space-y-1 overflow-y-auto rounded-[var(--radius-md)] p-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nothing to add — every {CATEGORIES.find((c) => c.key === category)?.label.toLowerCase()} title in your
              library is already ranked, or your library has none of this type yet.
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
                <span className="truncate text-sm">{c.title}</span>
              </button>
            ))
          )}
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
        <div className="space-y-2">
          {rankings.map((r, i) => (
            <div key={r.id} className="glass flex items-center gap-3 rounded-[var(--radius-md)] p-2.5">
              <span className="w-7 shrink-0 text-center font-display text-lg font-bold text-[var(--accent)]">{i + 1}</span>
              <Link href={detailHref(r.category, r.item_id)} className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-elevated)]">
                {r.poster_url && <Image src={r.poster_url} alt="" fill sizes="40px" className="object-cover" />}
              </Link>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => void move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--glass-strong)] disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button onClick={() => void move(i, 1)} disabled={i === rankings.length - 1} className="grid size-8 place-items-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--glass-strong)] disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button onClick={() => void remove(r.id)} className="grid size-8 place-items-center rounded-[8px] text-[var(--dropped)] hover:bg-[var(--glass-strong)]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
