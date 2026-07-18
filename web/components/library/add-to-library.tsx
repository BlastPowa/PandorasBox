"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, ChevronDown, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReelItem, ReelItemStatus, ReelItemType } from "@core/storage/schema";
import { createDefaultProgress } from "@core/storage/schema";
import { getStatusLabel } from "@core/utils/formatters";
import { useLibrary } from "@/lib/library/use-library";
import { RatingStars } from "@/components/ui-fx/rating-stars";
import { StatusBadge } from "@/components/ui-fx/badge";
import { cn } from "@/lib/utils";

export interface LibrarySeed {
  id: string;
  source: "tmdb" | "anilist" | "mangadex" | "comicvine";
  type: ReelItemType;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string | null;
  genres: string[];
  year: number | null;
  totalEpisodes: number | null;
  totalChapters: number | null;
  totalSeasons: number | null;
  anilistId: number | null;
  tmdbId: number | null;
  mangadexId: string | null;
  malId: number | null;
}

function statusesFor(type: ReelItemType): ReelItemStatus[] {
  const statuses: ReelItemStatus[] = ["watching"];
  if (type === "series" || type === "anime") statuses.push("rewatching");
  if (type === "manga" || type === "manhwa" || type === "comic") statuses.push("reading");
  return [...statuses, "completed", "on_hold", "planned", "dropped"];
}

function seedToItem(seed: LibrarySeed, status: ReelItemStatus): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const progress = createDefaultProgress();
  progress.totalEpisodes = seed.totalEpisodes;
  progress.totalChapters = seed.totalChapters;
  progress.totalSeasons = seed.totalSeasons;
  return {
    id: seed.id,
    source: seed.source,
    type: seed.type,
    title: seed.title,
    posterUrl: seed.posterUrl,
    backdropUrl: seed.backdropUrl,
    synopsis: seed.synopsis,
    status,
    progress,
    rating: null,
    genres: seed.genres,
    totalEpisodes: seed.totalEpisodes,
    totalChapters: seed.totalChapters,
    totalSeasons: seed.totalSeasons,
    year: seed.year,
    anilistId: seed.anilistId,
    tmdbId: seed.tmdbId,
    mangadexId: seed.mangadexId,
    malId: seed.malId,
    completedAt: null,
    lastWatchedSite: null,
  };
}

export function AddToLibrary({ seed, compact = false }: { seed: LibrarySeed; compact?: boolean }) {
  const { signedIn, getById, add, setStatus, setRating, remove, markEpisode, markChapter, markComplete } =
    useLibrary();
  const [busy, setBusy] = useState(false);
  const existing = getById(seed.id);
  const isReading = seed.type === "manga" || seed.type === "manhwa" || seed.type === "comic";
  const isMovie = seed.type === "movie";
  const defaultStatus: ReelItemStatus = isReading ? "reading" : "watching";

  async function onMarkNext() {
    if (!existing) return;
    setBusy(true);
    try {
      if (isMovie) {
        await markComplete(seed.id);
        toast.success("Marked as watched");
      } else if (isReading) {
        const next = (existing.progress.currentChapter ?? 0) + 1;
        await markChapter(seed.id, next);
        toast.success(seed.type === "comic" ? `Issue ${next} read` : `Chapter ${next} read`);
      } else {
        const next = (existing.progress.currentEpisode ?? 0) + 1;
        await markEpisode(seed.id, next);
        toast.success(`Episode ${next} watched`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(status: ReelItemStatus) {
    setBusy(true);
    try {
      await add(seedToItem(seed, status));
      toast.success(`Added to ${getStatusLabel(status)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function onSetStatus(status: ReelItemStatus) {
    setBusy(true);
    try {
      await setStatus(seed.id, status);
      toast.success(`Moved to ${getStatusLabel(status)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    const nextPath =
      seed.type === "comic"
        ? `/comic/${seed.id.replace("comicvine-", "")}`
        : `/title/${seed.type}/${seed.source}/${seed.anilistId ?? seed.tmdbId ?? seed.mangadexId}`;
    return (
      <a
        href={`/login?next=${nextPath}`}
        className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-5 text-sm font-semibold text-[#0a0a0f]"
      >
        <Plus className="size-4" /> {compact ? "Track" : "Sign in to track"}
      </a>
    );
  }

  if (!existing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdd(defaultStatus)}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-l-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-5 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60"
        >
          <Plus className="size-4" /> {compact ? "Add" : "Add to Library"}
        </button>
        <StatusDropdown type={seed.type} onSelect={onAdd} trigger={
          <button className="inline-flex h-11 items-center rounded-r-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] pr-3 pl-1 text-[#0a0a0f]">
            <ChevronDown className="size-4" />
          </button>
        } />
      </div>
    );
  }

  if (compact) {
    return (
      <StatusDropdown
        type={seed.type}
        onSelect={onSetStatus}
        trigger={<button className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold" aria-label={`Tracking status: ${getStatusLabel(existing.status)}`}><Check className="size-4 text-[var(--completed)]" /><span className="hidden sm:inline">{getStatusLabel(existing.status)}</span><ChevronDown className="size-4 opacity-60" /></button>}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusDropdown
        type={seed.type}
        onSelect={onSetStatus}
        trigger={
          <button className="glass inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold">
            <Check className="size-4 text-[var(--completed)]" />
            <StatusBadge status={existing.status} />
            <ChevronDown className="size-4 opacity-60" />
          </button>
        }
      />
      {existing.status !== "completed" && seed.type !== "comic" && (
        <button
          onClick={onMarkNext}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-4 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60"
        >
          <Plus className="size-4" />
          {isMovie
            ? "Mark watched"
            : isReading
              ? `Ch ${(existing.progress.currentChapter ?? 0) + 1}`
              : `Ep ${(existing.progress.currentEpisode ?? 0) + 1}`}
        </button>
      )}
      <div className="glass flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-3">
        <RatingStars value={existing.rating} onChange={(v) => void setRating(seed.id, v)} size={16} />
      </div>
      <button
        onClick={() => void remove(seed.id)}
        className="glass inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--dropped)] hover:bg-[rgba(239,68,68,0.12)]"
        aria-label="Remove from library"
      >
        <Trash2 className="size-4" />
      </button>
      {!isMovie && (
        <span className="w-full font-mono text-xs text-[var(--text-muted)]">
          {isReading
            ? `${seed.type === "comic" ? "Issue" : "Chapter"} ${seed.type === "comic" && existing.progress.currentIssueNumber ? existing.progress.currentIssueNumber : existing.progress.currentChapter ?? 0}${existing.totalChapters ? ` · ${existing.progress.currentChapter ?? 0} / ${existing.totalChapters} read` : ""}`
            : `Episode ${existing.progress.currentEpisode ?? 0}${existing.totalEpisodes ? ` / ${existing.totalEpisodes}` : ""}`}
        </span>
      )}
    </div>
  );
}

function StatusDropdown({
  type,
  onSelect,
  trigger,
}: {
  type: ReelItemType;
  onSelect: (s: ReelItemStatus) => void;
  trigger: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-2xl"
        >
          {statusesFor(type).map((s) => (
            <DropdownMenu.Item
              key={s}
              onSelect={() => onSelect(s)}
              className={cn(
                "cursor-pointer rounded-[8px] px-3 py-2 text-sm outline-none transition-colors",
                "text-[var(--text-secondary)] focus:bg-[var(--glass)] focus:text-[var(--text)]"
              )}
            >
              {getStatusLabel(s)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
