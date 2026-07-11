"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, ListChecks, Undo2 } from "lucide-react";
import type { JikanEpisode } from "@core/api/jikan";
import { formatAirDate } from "@core/utils/formatters";
import { Spinner } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";
import { useLibrary } from "@/lib/library/use-library";
import { ReviewsPanel } from "@/components/reviews/reviews-panel";
import { episodeMediaKey } from "@/lib/reviews/reviews";

export function AnimeEpisodesSection({
  itemId,
  malId,
  initialEpisodes,
}: {
  itemId: string;
  malId: number;
  initialEpisodes: JikanEpisode[];
}) {
  const [episodes] = useState<JikanEpisode[]>(initialEpisodes);
  const [selected, setSelected] = useState<JikanEpisode | null>(null);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [synopsisLoading, setSynopsisLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { getById, markEpisode, updateProgress } = useLibrary();
  const item = getById(itemId);

  function isWatched(ep: JikanEpisode): boolean {
    if (!item) return false;
    return ep.mal_id <= (item.progress.currentEpisode ?? 0);
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
      await updateProgress(itemId, { currentEpisode: max });
      toast.success(`Marked up to episode ${max} watched`);
      setChecked(new Set());
      setSelectMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function unmark(ep: JikanEpisode) {
    try {
      await updateProgress(itemId, { currentEpisode: Math.max(0, ep.mal_id - 1) });
      toast.success(`Episode ${ep.mal_id} unmarked`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function openEpisode(ep: JikanEpisode) {
    setSelected(ep);
    setSynopsis(null);
    setSynopsisLoading(true);
    try {
      const res = await fetch(`/api/anime-episode?malId=${malId}&ep=${ep.mal_id}`);
      const json = (await res.json()) as { episode: { synopsis: string | null } | null };
      setSynopsis(json.episode?.synopsis ?? null);
    } catch {
      setSynopsis(null);
    } finally {
      setSynopsisLoading(false);
    }
  }

  if (episodes.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Episodes</h2>
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

      {selectMode && (
        <div className="mb-3 flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span>{checked.size} selected — marks everything up to the highest pick as watched</span>
          <Button size="sm" onClick={markSelected} disabled={checked.size === 0}>
            <Check className="size-3.5" /> Mark selected
          </Button>
        </div>
      )}

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {episodes.map((ep) => {
          const watched = isWatched(ep);
          return (
            <div
              key={ep.mal_id}
              className={`glass glow-ring relative w-[78vw] max-w-[320px] shrink-0 snap-start rounded-[var(--radius-lg)] p-3 ${selectMode ? "pl-11" : "pr-9"} text-left ${watched ? "opacity-70" : ""}`}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={checked.has(ep.mal_id)}
                  onChange={() => toggleCheck(ep.mal_id)}
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 accent-[var(--accent)]"
                />
              )}
              <button onClick={() => !selectMode && void openEpisode(ep)} className="flex flex-1 items-center gap-3 text-left">
                <div className="grid aspect-video w-24 shrink-0 place-items-center rounded-[8px] bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.18),var(--bg-elevated))] font-mono text-xs text-[var(--accent)]">
                  E{ep.mal_id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{ep.title || `Episode ${ep.mal_id}`}</h3>
                    {ep.filler && <span className="shrink-0 rounded-full bg-[rgb(var(--gold-rgb)/0.15)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--gold)]">FILLER</span>}
                    {ep.recap && <span className="shrink-0 rounded-full bg-[var(--glass)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted)]">RECAP</span>}
                  </div>
                  {ep.aired && <span className="text-xs text-[var(--text-muted)]">{formatAirDate(ep.aired)}</span>}
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

      <Dialog.Root open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
            {selected && (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--accent)]">Episode {selected.mal_id}</span>
                  <Dialog.Close className="grid size-8 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <Dialog.Title className="font-display text-lg font-bold">{selected.title || `Episode ${selected.mal_id}`}</Dialog.Title>
                {selected.aired && <p className="mt-1 text-xs text-[var(--text-muted)]">{formatAirDate(selected.aired)}</p>}
                <Dialog.Description asChild>
                  <div className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {synopsisLoading ? (
                      <div className="flex justify-center py-4"><Spinner size={20} /></div>
                    ) : (
                      synopsis || "No synopsis available for this episode yet."
                    )}
                  </div>
                </Dialog.Description>
                {item && (
                  <Button
                    size="sm"
                    variant="glass"
                    className="mt-4"
                    disabled={isWatched(selected)}
                    onClick={() => {
                      void markEpisode(itemId, selected.mal_id).then(() =>
                        toast.success(`Episode ${selected.mal_id} marked watched`)
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
                    className="ml-2 mt-4"
                    onClick={() => {
                      void unmark(selected);
                      setSelected(null);
                    }}
                  >
                    <Undo2 className="size-4" /> Unmark
                  </Button>
                )}

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <ReviewsPanel mediaKey={episodeMediaKey(itemId, selected.mal_id)} scrollable />
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
