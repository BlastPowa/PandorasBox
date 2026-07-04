"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { TMDBEpisode } from "@core/api/tmdb";
import { formatAirDate, formatRuntime } from "@core/utils/formatters";
import { Spinner } from "@/components/ui-fx/feedback";

export function EpisodesSection({
  tmdbId,
  totalSeasons,
  initialEpisodes,
}: {
  tmdbId: number;
  totalSeasons: number;
  initialEpisodes: TMDBEpisode[];
}) {
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>(initialEpisodes);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TMDBEpisode | null>(null);

  async function changeSeason(next: number) {
    setSeason(next);
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

  const seasons = Array.from({ length: Math.max(1, totalSeasons) }, (_, i) => i + 1);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Episodes</h2>
        {seasons.length > 1 && (
          <select
            value={season}
            onChange={(e) => void changeSeason(Number.parseInt(e.target.value, 10))}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>Season {s}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : episodes.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No episode data for this season.</p>
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => setSelected(ep)}
              className="glass glow-ring flex w-full gap-3 rounded-[var(--radius-md)] p-2.5 text-left"
            >
              <div className="relative h-[62px] w-[110px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--bg-elevated)]">
                {ep.still_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center font-mono text-xs text-[var(--text-muted)]">E{ep.episode_number}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-[var(--accent)]">E{ep.episode_number}</span>
                  <h3 className="truncate text-sm font-semibold">{ep.name}</h3>
                </div>
                {ep.air_date && <span className="text-xs text-[var(--text-muted)]">{formatAirDate(ep.air_date)}</span>}
                {ep.overview && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{ep.overview}</p>}
              </div>
            </button>
          ))}
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
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
