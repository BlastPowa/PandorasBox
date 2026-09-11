"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, ListVideo, Search, X } from "lucide-react";
import type { TMDBEpisode } from "@core/api/tmdb";
import type { JikanEpisode } from "@core/api/jikan";
import { PBoxPlayerShell } from "./pbox-player-shell";

type WatchEpisode = {
  number: number;
  title: string;
  overview: string | null;
  stillUrl: string | null;
  runtime: number | null;
};

function seriesEpisodes(episodes: TMDBEpisode[]): WatchEpisode[] {
  return episodes.map((episode) => ({
    number: episode.episode_number,
    title: episode.name || `Episode ${episode.episode_number}`,
    overview: episode.overview || null,
    stillUrl: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
    runtime: episode.runtime ?? null,
  }));
}

function animeEpisodes(episodes: JikanEpisode[]): WatchEpisode[] {
  return episodes.map((episode) => ({
    number: episode.mal_id,
    title: episode.title || `Episode ${episode.mal_id}`,
    overview: null,
    stillUrl: null,
    runtime: null,
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
  backdropUrl,
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
  backdropUrl: string | null;
}) {
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<WatchEpisode[]>(() =>
    type === "series" ? seriesEpisodes(initialSeriesEpisodes) : animeEpisodes(initialAnimeEpisodes)
  );
  const [episode, setEpisode] = useState<number | null>(() => episodes[0]?.number ?? (type === "movie" ? null : 1));
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeBrowserOpen, setEpisodeBrowserOpen] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState("");

  useEffect(() => {
    if (!episodeBrowserOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEpisodeBrowserOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [episodeBrowserOpen]);

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
  const filteredEpisodes = useMemo(() => {
    const query = episodeQuery.trim().toLowerCase();
    if (!query) return episodes;
    return episodes.filter((entry) =>
      entry.title.toLowerCase().includes(query) ||
      String(entry.number).includes(query) ||
      entry.overview?.toLowerCase().includes(query)
    );
  }, [episodeQuery, episodes]);
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
        onOpenEpisodes={() => setEpisodeBrowserOpen(true)}
      />

      {selectedEpisode && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
              {type === "series" ? `Season ${season} · ` : ""}Episode {selectedEpisode.number}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{selectedEpisode.title}</h2>
            {selectedEpisode.overview && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">{selectedEpisode.overview}</p>}
          </div>
          <button type="button" onClick={() => setEpisodeBrowserOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
            <ListVideo className="size-4" /> Browse episodes
          </button>
        </div>
      )}

      {episodeBrowserOpen && (
        <div className="fixed inset-0 z-[120] overflow-hidden bg-[#030304] text-white" role="dialog" aria-modal="true" aria-label="Episode browser">
          <div className="absolute inset-0 lg:right-[430px]">
            {(selectedEpisode?.stillUrl || backdropUrl) && (
              <img src={selectedEpisode?.stillUrl ?? backdropUrl ?? ""} alt="" className="size-full scale-[1.035] object-cover opacity-65 blur-[2px]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,2,3,.42)_0%,rgba(2,2,3,.62)_58%,#030304_100%),linear-gradient(0deg,#030304_0%,transparent_34%,rgba(0,0,0,.28)_100%)]" />
          </div>

          <div className="absolute left-4 top-4 z-20 w-[min(260px,calc(100vw-88px))] sm:left-6 sm:top-6">
            <label className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-white/65 shadow-xl backdrop-blur-xl focus-within:border-white/30 focus-within:text-white">
              <Search className="size-4 shrink-0" />
              <input value={episodeQuery} onChange={(event) => setEpisodeQuery(event.target.value)} placeholder="Search episodes…" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white outline-none placeholder:text-white/45" autoFocus />
            </label>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden p-8 pr-[470px] lg:block">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">Now playing</p>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight xl:text-5xl">{title}</h2>
              {selectedEpisode && (
                <>
                  <p className="mt-3 text-sm font-bold text-white/85">{type === "series" ? `S${season} · ` : ""}E{selectedEpisode.number} · {selectedEpisode.title}</p>
                  {selectedEpisode.overview && <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">{selectedEpisode.overview}</p>}
                </>
              )}
            </div>
          </div>

          <aside className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-white/8 bg-[rgba(5,5,6,.91)] shadow-[-30px_0_80px_rgba(0,0,0,.38)] backdrop-blur-2xl sm:w-[430px]">
            <div className="flex h-[74px] items-center gap-3 border-b border-white/8 px-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold tracking-tight">Episodes</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{title}</p>
              </div>
              {type === "series" && seasonCount > 1 && (
                <label className="relative inline-flex h-9 items-center rounded-full border border-white/10 bg-white/8 pl-3 pr-8 text-xs font-bold text-white/85">
                  <select value={season} onChange={(event) => setSeason(Number(event.target.value))} className="appearance-none bg-transparent outline-none" aria-label="Season">
                    {Array.from({ length: seasonCount }, (_, index) => index + 1).map((value) => <option key={value} value={value} className="bg-[#080809]">Season {value}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-white/50" />
                </label>
              )}
              <button type="button" onClick={() => setEpisodeBrowserOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="Close episode browser"><X className="size-4" /></button>
            </div>

            {type === "series" && seasonCount > 1 && (
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2 sm:px-5">
                <button type="button" aria-label="Previous season" disabled={season <= 1} onClick={() => setSeason((value) => Math.max(1, value - 1))} className="grid size-8 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 disabled:opacity-20"><ChevronLeft className="size-4" /></button>
                <div className="min-w-0 flex-1 text-center text-[11px] font-bold text-white/45">Season {season} of {seasonCount}</div>
                <button type="button" aria-label="Next season" disabled={season >= seasonCount} onClick={() => setSeason((value) => Math.min(seasonCount, value + 1))} className="grid size-8 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 disabled:opacity-20"><ChevronRight className="size-4" /></button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin] sm:p-4">
              {loadingEpisodes ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton aspect-[16/7] rounded-2xl" />)}</div>
              ) : filteredEpisodes.length > 0 ? (
                <div className="space-y-3">
                  {filteredEpisodes.map((entry) => {
                    const active = entry.number === episode;
                    return (
                      <button
                        key={entry.number}
                        type="button"
                        onClick={() => setEpisode(entry.number)}
                        className={`group relative w-full overflow-hidden rounded-2xl border text-left shadow-lg transition duration-200 ${active ? "border-[rgb(var(--accent-rgb)/0.75)] ring-1 ring-[rgb(var(--accent-rgb)/0.35)]" : "border-white/8 hover:border-white/20"}`}
                      >
                        <div className="relative aspect-[16/8] overflow-hidden bg-[#111114]">
                          {entry.stillUrl ? <img src={entry.stillUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.025]" /> : <div className="grid size-full place-items-center text-sm font-black text-white/20">EP {entry.number}</div>}
                          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.92)_0%,rgba(0,0,0,.14)_72%)]" />
                          {active && <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-black"><Check className="size-3" strokeWidth={3} /> Now playing</span>}
                          {entry.runtime && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[9px] font-bold text-white/80 backdrop-blur"><Clock3 className="size-3" /> {entry.runtime}m</span>}
                          <div className="absolute inset-x-0 bottom-0 p-3.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">{type === "series" ? `S${season} · ` : ""}E{entry.number}</p>
                            <p className="mt-1 line-clamp-1 text-sm font-extrabold text-white">{entry.title}</p>
                            {entry.overview && <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/48">{entry.overview}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
                  <div><ListVideo className="mx-auto size-6 text-white/25" /><p className="mt-2 text-sm font-semibold text-white/55">No episodes found</p><p className="mt-1 text-xs text-white/30">Try another search or season.</p></div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
