"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import type { TMDBEpisode } from "@core/api/tmdb";
import type { JikanEpisode } from "@core/api/jikan";
import { PBoxPlayerShell } from "./pbox-player-shell";

type WatchEpisode = {
  number: number;
  title: string;
  overview: string | null;
  stillUrl: string | null;
};

function seriesEpisodes(episodes: TMDBEpisode[]): WatchEpisode[] {
  return episodes.map((episode) => ({
    number: episode.episode_number,
    title: episode.name || `Episode ${episode.episode_number}`,
    overview: episode.overview || null,
    stillUrl: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
  }));
}

function animeEpisodes(episodes: JikanEpisode[]): WatchEpisode[] {
  return episodes.map((episode) => ({
    number: episode.mal_id,
    title: episode.title || `Episode ${episode.mal_id}`,
    overview: null,
    stillUrl: null,
  }));
}

export function PBoxWatchExperience({
  itemId,
  title,
  type,
  year,
  tmdbId,
  totalSeasons,
  totalEpisodes,
  initialSeriesEpisodes,
  initialAnimeEpisodes,
}: {
  itemId: string;
  title: string;
  type: "movie" | "series" | "anime";
  year: number | null;
  tmdbId: number | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  initialSeriesEpisodes: TMDBEpisode[];
  initialAnimeEpisodes: JikanEpisode[];
}) {
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<WatchEpisode[]>(() =>
    type === "series" ? seriesEpisodes(initialSeriesEpisodes) : animeEpisodes(initialAnimeEpisodes)
  );
  const [episode, setEpisode] = useState<number | null>(() => episodes[0]?.number ?? (type === "movie" ? null : 1));
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (type !== "series" || !tmdbId || season === 1) return;
    const controller = new AbortController();
    setLoadingEpisodes(true);
    void fetch(`/api/episodes?id=${tmdbId}&season=${season}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { episodes?: TMDBEpisode[] };
        const next = seriesEpisodes(data.episodes ?? []);
        setEpisodes(next);
        setEpisode(next[0]?.number ?? 1);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEpisodes([]);
        setEpisode(1);
      })
      .finally(() => setLoadingEpisodes(false));
    return () => controller.abort();
  }, [season, tmdbId, type]);

  useEffect(() => {
    if (type !== "series" || season !== 1) return;
    const next = seriesEpisodes(initialSeriesEpisodes);
    setEpisodes(next);
    setEpisode(next[0]?.number ?? 1);
  }, [initialSeriesEpisodes, season, type]);

  const selectedEpisode = useMemo(() => episodes.find((entry) => entry.number === episode) ?? null, [episode, episodes]);
  const seasonCount = Math.max(1, totalSeasons ?? 1);
  const isFinalEpisode = Boolean(
    episode &&
    ((type === "series" && season === seasonCount && selectedEpisode && selectedEpisode.number === episodes.at(-1)?.number) ||
      (type === "anime" && totalEpisodes && episode >= totalEpisodes))
  );

  const playNextEpisode = useCallback(() => {
    if (!episode) return;
    if (type === "anime") {
      if (!totalEpisodes || episode < totalEpisodes) setEpisode(episode + 1);
      return;
    }

    const currentIndex = episodes.findIndex((entry) => entry.number === episode);
    const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : null;
    if (nextEpisode) {
      setEpisode(nextEpisode.number);
      return;
    }
    if (season < seasonCount) setSeason((value) => Math.min(seasonCount, value + 1));
  }, [episode, episodes, season, seasonCount, totalEpisodes, type]);

  if (type === "movie") {
    return <PBoxPlayerShell itemId={itemId} title={title} type={type} year={year} showUnavailable />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <PBoxPlayerShell
          itemId={itemId}
          title={title}
          type={type}
          year={year}
          season={type === "series" ? season : 1}
          episode={episode}
          episodeTitle={selectedEpisode?.title ?? null}
          isFinalEpisode={isFinalEpisode}
          showUnavailable
          onAutoNext={playNextEpisode}
        />
        {selectedEpisode && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
              {type === "series" ? `Season ${season} · ` : ""}Episode {selectedEpisode.number}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{selectedEpisode.title}</h2>
            {selectedEpisode.overview && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{selectedEpisode.overview}</p>}
          </div>
        )}
      </div>

      <aside className="overflow-hidden rounded-[24px] border border-white/10 bg-black/45 backdrop-blur-xl">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><ListVideo className="size-4 text-[var(--accent)]" /> Episodes</div>
          {type === "series" && seasonCount > 1 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-1">
              <button type="button" aria-label="Previous season" disabled={season <= 1} onClick={() => setSeason((value) => Math.max(1, value - 1))} className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-25"><ChevronLeft className="size-4" /></button>
              <span className="text-xs font-bold text-white/80">Season {season} of {seasonCount}</span>
              <button type="button" aria-label="Next season" disabled={season >= seasonCount} onClick={() => setSeason((value) => Math.min(seasonCount, value + 1))} className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-25"><ChevronRight className="size-4" /></button>
            </div>
          )}
        </div>

        <div className="max-h-[640px] space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">
          {loadingEpisodes ? (
            <div className="space-y-2 p-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-16 rounded-xl" />)}</div>
          ) : episodes.length > 0 ? (
            episodes.map((entry) => {
              const active = entry.number === episode;
              return (
                <button
                  key={entry.number}
                  type="button"
                  onClick={() => setEpisode(entry.number)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${active ? "bg-[rgb(var(--accent-rgb)/0.16)] ring-1 ring-[rgb(var(--accent-rgb)/0.45)]" : "hover:bg-white/5"}`}
                >
                  <div className="relative grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5 font-mono text-[11px] text-white/45">
                    {entry.stillUrl ? <img src={entry.stillUrl} alt="" className="size-full object-cover" /> : `E${entry.number}`}
                    {active && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[var(--accent)] text-black"><Check className="size-3" strokeWidth={3} /></span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">Episode {entry.number}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white/80">{entry.title}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="p-4 text-sm text-white/45">No episode metadata is available for this season yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
