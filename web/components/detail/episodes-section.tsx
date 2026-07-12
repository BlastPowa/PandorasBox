"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, ListChecks, Undo2 } from "lucide-react";
import type { TMDBEpisode } from "@core/api/tmdb";
import { formatAirDate, formatRuntime } from "@core/utils/formatters";
import { Spinner } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";
import { useLibrary } from "@/lib/library/use-library";
import { ReviewsPanel } from "@/components/reviews/reviews-panel";
import { episodeMediaKey } from "@/lib/reviews/reviews";

export function EpisodesSection({
  itemId,
  tmdbId,
  totalSeasons,
  initialEpisodes,
}: {
  itemId: string;
  tmdbId: number;
  totalSeasons: number;
  initialEpisodes: TMDBEpisode[];
}) {
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>(initialEpisodes);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TMDBEpisode | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { getById, markEpisode, updateProgress } = useLibrary();
  const item = getById(itemId);

  function isWatched(ep: TMDBEpisode): boolean {
    if (!item) return false;
    const currentSeason = item.progress.currentSeason ?? 1;
    const currentEpisode = item.progress.currentEpisode ?? 0;
    if (season !== currentSeason) return season < currentSeason;
    return ep.episode_number <= currentEpisode;
  }

  async function changeSeason(next: number) {
    setSeason(next);
    setChecked(new Set());
    setLoading(true);
    try {
      const res = await fetch(`/api/episodes?id=${tmdbId}&season=${next}`);
      const json = (await res.json()) as { episodes: TMDBEpisode[] };
      setEpisodes(json.episodes);
    } catch {
      toast.error("Could not load that season");
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(epNumber: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(epNumber)) next.delete(epNumber);
      else next.add(epNumber);
      return next;
    });
  }

  async function markSelected() {
    if (checked.size === 0) return;
    const max = Math.max(...checked);
    try {
      await updateProgress(itemId, { currentSeason: season, currentEpisode: max });
      toast.success(`Marked up to episode ${max} watched`);
      setChecked(new Set());
      setSelectMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function unmark(ep: TMDBEpisode) {
    try {
      await updateProgress(itemId, { currentSeason: season, currentEpisode: Math.max(0, ep.episode_number - 1) });
      toast.success(`Episode ${ep.episode_number} unmarked`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  const seasons = Array.from({ length: Math.max(1, totalSeasons) }, (_, i) => i + 1);

  return (
    <section className="mt-10 border-t border-[var(--border)] pt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Episodes</h2>
        <div className="flex items-center gap-2">
          {seasons.length > 1 && <div className="flex max-w-[60vw] gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--glass)] p-1 [scrollbar-width:none]">{seasons.map((value) => <button key={value} type="button" onClick={() => void changeSeason(value)} aria-pressed={season === value} className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${season === value ? "bg-[var(--accent)] text-[#08090d]" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>Season {value}</button>)}</div>}
          {item && (
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setChecked(new Set());
              }}
              className={`flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-xs font-semibold ${
                selectMode ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              <ListChecks className="size-3.5" /> {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="mb-3 flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span>{checked.size} selected — marks everything up to the highest pick as watched</span>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setChecked(checked.size === episodes.length ? new Set() : new Set(episodes.map((episode) => episode.episode_number)))} className="rounded-full px-3 py-1.5 font-semibold text-[var(--accent)] hover:bg-[var(--glass-strong)]">{checked.size === episodes.length ? "Clear all" : "Select all"}</button><Button size="sm" onClick={markSelected} disabled={checked.size === 0}>
            <Check className="size-3.5" /> Mark selected
          </Button></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : episodes.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No episode data for this season.</p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 [scrollbar-width:thin]">
          {episodes.map((ep) => {
            const watched = isWatched(ep);
            return (
              <div
                key={ep.id}
                className={`glass glow-ring relative w-[82vw] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] text-left sm:w-[320px] lg:w-[calc((100%_-_3rem)/4)] ${selectMode ? "pl-9" : ""} ${watched ? "opacity-70" : ""}`}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={checked.has(ep.episode_number)}
                    onChange={() => toggleCheck(ep.episode_number)}
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 accent-[var(--accent)]"
                  />
                )}
                <button onClick={() => !selectMode && setSelected(ep)} className="block w-full text-left">
                  <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-elevated)]">
                    {ep.still_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://image.tmdb.org/t/p/w500${ep.still_path}`} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center font-mono text-xs text-[var(--text-muted)]">E{ep.episode_number}</div>
                    )}
                  </div>
                  <div className="min-w-0 p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-[var(--accent)]">E{ep.episode_number}</span>
                      <h3 className="truncate text-sm font-semibold">{ep.name}</h3>
                    </div>
                    {ep.air_date && <span className="text-xs text-[var(--text-muted)]">{formatAirDate(ep.air_date)}</span>}
                    {ep.runtime !== null && <span className="ml-2 text-xs text-[var(--text-muted)]">{formatRuntime(ep.runtime)}</span>}
                    {ep.overview && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{ep.overview}</p>}
                  </div>
                </button>
                {!selectMode && watched && (
                  <button
                    onClick={() => void unmark(ep)}
                    title="Unmark as watched"
                    aria-label="Unmark as watched"
                    className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-[var(--completed)] hover:bg-[var(--dropped)]"
                  >
                    <Check className="size-3.5 text-[#04180b]" strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Read-more modal (mobile-friendly) */}
      <Dialog.Root open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
            {selected && (
              <>
                <div className="relative aspect-video w-full bg-[var(--bg-surface)]">
                  {selected.still_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://image.tmdb.org/t/p/w780${selected.still_path}`} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center font-display text-3xl text-[var(--text-muted)]">
                      E{selected.episode_number}
                    </div>
                  )}
                  <Dialog.Close className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="p-5">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[var(--accent)]">Episode {selected.episode_number}</span>
                    {selected.air_date && <span className="text-xs text-[var(--text-muted)]">{formatAirDate(selected.air_date)}</span>}
                    {selected.runtime !== null && <span className="text-xs text-[var(--text-muted)]">· {formatRuntime(selected.runtime)}</span>}
                  </div>
                  <Dialog.Title className="font-display text-lg font-bold">{selected.name}</Dialog.Title>
                  <Dialog.Description asChild>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {selected.overview || "No synopsis available for this episode yet."}
                    </p>
                  </Dialog.Description>
                  {item && (
                    <Button
                      size="sm"
                      variant="glass"
                      className="mt-4"
                      disabled={isWatched(selected)}
                      onClick={() => {
                        void markEpisode(itemId, selected.episode_number, season).then(() =>
                          toast.success(`Episode ${selected.episode_number} marked watched`)
                        );
                      }}
                    >
                      <Check className="size-4 text-[var(--completed)]" />
                      {isWatched(selected) ? "Watched" : "Mark as watched"}
                    </Button>
                  )}
                  {item && isWatched(selected) && (
                    <Button
                      size="sm"
                      variant="glass"
                      className="mt-4 ml-2"
                      onClick={() => {
                        void unmark(selected);
                        setSelected(null);
                      }}
                    >
                      <Undo2 className="size-4" /> Unmark
                    </Button>
                  )}

                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <ReviewsPanel mediaKey={episodeMediaKey(itemId, selected.episode_number)} scrollable />
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
