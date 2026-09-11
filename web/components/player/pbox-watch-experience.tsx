"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, ListVideo, Search, X } from "lucide-react";
import type { TMDBEpisode } from "@core/api/tmdb";
import type { JikanEpisode } from "@core/api/jikan";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterRow } from "@/components/discovery/poster-row";
import { PBoxPlayerShell } from "./pbox-player-shell";

type WatchEpisode = {
  number: number;
  title: string;
  overview: string | null;
  stillUrl: string | null;
  runtime: number | null;
};

type EpisodeViewMode = "cards" | "compact" | "numbers";

const EPISODE_RANGE_SIZE = 100;

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
  titleAliases,
  type,
  year,
  tmdbId,
  totalSeasons,
  totalEpisodes,
  initialSeriesEpisodes,
  initialAnimeEpisodes,
  backdropUrl,
  synopsis,
  collectionName,
  collectionItems,
}: {
  itemId: string;
  title: string;
  titleAliases: string[];
  type: "movie" | "series" | "anime";
  year: number | null;
  tmdbId: number | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  initialSeriesEpisodes: TMDBEpisode[];
  initialAnimeEpisodes: JikanEpisode[];
  backdropUrl: string | null;
  synopsis: string | null;
  collectionName: string | null;
  collectionItems: UnifiedSearchResult[];
}) {
  const router = useRouter();
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<WatchEpisode[]>(() =>
    type === "series" ? seriesEpisodes(initialSeriesEpisodes) : animeEpisodes(initialAnimeEpisodes)
  );
  const [episode, setEpisode] = useState<number | null>(() => episodes[0]?.number ?? (type === "movie" ? null : 1));
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeBrowserOpen, setEpisodeBrowserOpen] = useState(false);
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [episodeViewMode, setEpisodeViewMode] = useState<EpisodeViewMode>("cards");
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
  const [episodeRange, setEpisodeRange] = useState(0);

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
    queueMicrotask(() => setLoadingEpisodes(true));
    void fetch(`/api/episodes?id=${tmdbId}&season=${season}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { episodes?: TMDBEpisode[] };
        const next = seriesEpisodes(data.episodes ?? []);
        setEpisodes(next);
        setEpisode((current) => next.some((entry) => entry.number === current) ? current : (next[0]?.number ?? 1));
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
    queueMicrotask(() => {
      setEpisodes(next);
      setEpisode((current) => next.some((entry) => entry.number === current) ? current : (next[0]?.number ?? 1));
    });
  }, [initialSeriesEpisodes, season, type]);

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
  const numberedEpisodes = useMemo(() => {
    if (type !== "anime" || !totalEpisodes || totalEpisodes <= episodes.length) return episodes;
    const knownEpisodes = new Map(episodes.map((entry) => [entry.number, entry]));
    return Array.from({ length: totalEpisodes }, (_, index) => {
      const number = index + 1;
      return knownEpisodes.get(number) ?? {
        number,
        title: `Episode ${number}`,
        overview: null,
        stillUrl: null,
        runtime: null,
      };
    });
  }, [episodes, totalEpisodes, type]);
  const selectedEpisode = useMemo(() => numberedEpisodes.find((entry) => entry.number === episode) ?? null, [episode, numberedEpisodes]);
  const filteredNumberedEpisodes = useMemo(() => {
    const query = episodeQuery.trim().toLowerCase();
    if (!query) return numberedEpisodes;
    return numberedEpisodes.filter((entry) =>
      entry.title.toLowerCase().includes(query) ||
      String(entry.number).includes(query) ||
      entry.overview?.toLowerCase().includes(query)
    );
  }, [episodeQuery, numberedEpisodes]);
  const episodeRangeCount = Math.max(1, Math.ceil(filteredNumberedEpisodes.length / EPISODE_RANGE_SIZE));
  const rangedNumberedEpisodes = useMemo(() => {
    const start = episodeRange * EPISODE_RANGE_SIZE;
    return filteredNumberedEpisodes.slice(start, start + EPISODE_RANGE_SIZE);
  }, [episodeRange, filteredNumberedEpisodes]);
  const isFinalEpisode = Boolean(
    episode &&
    ((type === "series" && season === seasonCount && selectedEpisode && selectedEpisode.number === episodes.at(-1)?.number) ||
      (type === "anime" && totalEpisodes && episode >= totalEpisodes))
  );

  const movieContinuation = useMemo(() => {
    if (type !== "movie" || !tmdbId || collectionItems.length < 2) return null;
    const currentIndex = collectionItems.findIndex((item) => item.tmdbId === tmdbId);
    if (currentIndex < 0) return null;
    const nextMovie = collectionItems[currentIndex + 1] ?? null;
    return { currentIndex, nextMovie };
  }, [collectionItems, tmdbId, type]);

  const playNextMovie = useCallback(() => {
    const nextMovie = movieContinuation?.nextMovie;
    if (!nextMovie?.tmdbId) return;
    router.push(`/watch/movie/tmdb/${nextMovie.tmdbId}`);
  }, [movieContinuation, router]);

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
    if (season < seasonCount) {
      setSeason((value) => Math.min(seasonCount, value + 1));
      setEpisodeRange(0);
    }
  }, [episode, episodes, season, seasonCount, totalEpisodes, type]);

  const selectEpisode = useCallback((nextEpisode: number) => {
    setEpisode(nextEpisode);
    setEpisodeBrowserOpen(false);
    setSeasonPickerOpen(false);
    setEpisodeQuery("");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("pbox-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  if (type === "movie") {
    const nextMovie = movieContinuation?.nextMovie ?? null;
    return (
      <div className="min-w-0 space-y-4">
        <PBoxPlayerShell
          itemId={itemId}
          title={title}
          titleAliases={titleAliases}
          type={type}
          year={year}
          showUnavailable
          onAutoNext={nextMovie?.tmdbId ? playNextMovie : undefined}
          nextLabel={nextMovie ? `${nextMovie.title}${nextMovie.year ? ` (${nextMovie.year})` : ""}` : undefined}
        />

        <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">About this movie</p>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/58">
            {synopsis || "No description is available for this movie yet."}
          </p>
          {nextMovie && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/25 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Next in {collectionName ?? "this collection"}</p>
                <p className="mt-1 truncate text-sm font-bold text-white/85">{nextMovie.title}{nextMovie.year ? ` · ${nextMovie.year}` : ""}</p>
              </div>
              <button
                type="button"
                onClick={playNextMovie}
                className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-black text-black transition hover:brightness-110"
              >
                Play next
              </button>
            </div>
          )}
        </section>

        {collectionItems.length > 1 && (
          <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:p-5">
            <PosterRow
              title={collectionName ?? "Connected movies"}
              subtitle="Release order · Auto Next follows this sequence when enabled in player settings"
              items={collectionItems}
            />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PBoxPlayerShell
        key={`${itemId}:${type}:${season}:${episode ?? 0}`}
        itemId={itemId}
        title={title}
        titleAliases={titleAliases}
        type={type}
        year={year}
        season={type === "series" ? season : 1}
        episode={episode}
        episodeTitle={selectedEpisode?.title ?? null}
        isFinalEpisode={isFinalEpisode}
        showUnavailable
        onAutoNext={playNextEpisode}
        onOpenEpisodes={() => {
          if (episode) setEpisodeRange(Math.floor((episode - 1) / EPISODE_RANGE_SIZE));
          setEpisodeBrowserOpen(true);
        }}
        onWatchPartyMediaChange={(next) => {
          if (next.episode == null) return;
          setEpisode(next.episode);
          if (type === "series" && next.season) {
            setSeason(next.season);
            setEpisodeRange(0);
          }
          setEpisodeBrowserOpen(false);
        }}
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
          <button type="button" onClick={() => {
            if (episode) setEpisodeRange(Math.floor((episode - 1) / EPISODE_RANGE_SIZE));
            setEpisodeBrowserOpen(true);
          }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
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
              <input value={episodeQuery} onChange={(event) => {
                const nextQuery = event.target.value;
                setEpisodeQuery(nextQuery);
                setEpisodeRange(!nextQuery.trim() && episode ? Math.floor((episode - 1) / EPISODE_RANGE_SIZE) : 0);
              }} placeholder="Search episodes…" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white outline-none placeholder:text-white/45" autoFocus />
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSeasonPickerOpen((open) => !open)}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 text-xs font-bold text-white/85 transition hover:bg-white/12"
                    aria-expanded={seasonPickerOpen}
                    aria-haspopup="listbox"
                  >
                    Season {season}
                    <ChevronDown className={`size-3.5 text-white/50 transition-transform ${seasonPickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {seasonPickerOpen && (
                    <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-white/12 bg-[#0b0b0d]/98 p-3 shadow-2xl backdrop-blur-2xl">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Choose season</p>
                        <span className="text-[10px] font-bold text-white/25">{seasonCount} total</span>
                      </div>
                      <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]" role="listbox" aria-label="Choose season">
                        {Array.from({ length: seasonCount }, (_, index) => index + 1).map((value) => (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={value === season}
                            onClick={() => {
                              setSeason(value);
                              setEpisodeRange(0);
                              setSeasonPickerOpen(false);
                            }}
                            className={`rounded-xl px-2 py-2.5 text-xs font-extrabold transition ${value === season ? "bg-[var(--accent)] text-black" : "bg-white/[0.055] text-white/65 hover:bg-white/10 hover:text-white"}`}
                          >
                            S{value}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={() => setEpisodeBrowserOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/15 hover:text-white" aria-label="Close episode browser"><X className="size-4" /></button>
            </div>

            <div className="border-b border-white/8 px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                {type === "series" && seasonCount > 1 && (
                  <>
                    <button type="button" aria-label="Previous season" disabled={season <= 1} onClick={() => {
                      setSeason((value) => Math.max(1, value - 1));
                      setEpisodeRange(0);
                      setSeasonPickerOpen(false);
                    }} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 disabled:opacity-20"><ChevronLeft className="size-4" /></button>
                    <div className="hidden min-w-0 text-[10px] font-bold text-white/35 sm:block">{season}/{seasonCount}</div>
                    <button type="button" aria-label="Next season" disabled={season >= seasonCount} onClick={() => {
                      setSeason((value) => Math.min(seasonCount, value + 1));
                      setEpisodeRange(0);
                      setSeasonPickerOpen(false);
                    }} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 disabled:opacity-20"><ChevronRight className="size-4" /></button>
                  </>
                )}
                <div className="ml-auto flex min-w-0 items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1" aria-label="Episode display style">
                  {([
                    ["cards", "Cards"],
                    ["compact", "List"],
                    ["numbers", "Numbers"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setEpisodeViewMode(mode);
                        if (mode === "numbers" && episode && !episodeQuery.trim()) {
                          setEpisodeRange(Math.floor((episode - 1) / EPISODE_RANGE_SIZE));
                        }
                      }}
                      aria-pressed={episodeViewMode === mode}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition ${episodeViewMode === mode ? "bg-white text-black" : "text-white/45 hover:bg-white/8 hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {episodeViewMode === "numbers" && episodeRangeCount > 1 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                  {Array.from({ length: episodeRangeCount }, (_, index) => {
                    const start = index * EPISODE_RANGE_SIZE + 1;
                    const end = Math.min(filteredNumberedEpisodes.length, (index + 1) * EPISODE_RANGE_SIZE);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setEpisodeRange(index)}
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black tabular-nums transition ${episodeRange === index ? "border-[rgb(var(--accent-rgb)/0.65)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]" : "border-white/8 bg-white/[0.035] text-white/35 hover:text-white/70"}`}
                      >
                        {start}-{end}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin] sm:p-4">
              {loadingEpisodes ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton aspect-[16/7] rounded-2xl" />)}</div>
              ) : episodeViewMode === "numbers" && rangedNumberedEpisodes.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Episode numbers</p>
                    <p className="text-[10px] font-bold text-white/25">{filteredNumberedEpisodes.length} episodes</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {rangedNumberedEpisodes.map((entry) => {
                      const active = entry.number === episode;
                      return (
                        <button
                          key={entry.number}
                          type="button"
                          onClick={() => selectEpisode(entry.number)}
                          title={entry.title}
                          className={`relative aspect-square rounded-xl border text-sm font-black tabular-nums transition ${active ? "border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_24px_rgb(var(--accent-rgb)/0.24)]" : "border-white/8 bg-white/[0.045] text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white"}`}
                        >
                          {entry.number}
                          {active && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-black/55" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : episodeViewMode === "compact" && filteredNumberedEpisodes.length > 0 ? (
                <div className="space-y-1.5">
                  {filteredNumberedEpisodes.map((entry) => {
                    const active = entry.number === episode;
                    return (
                      <button
                        key={entry.number}
                        type="button"
                        onClick={() => selectEpisode(entry.number)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-[rgb(var(--accent-rgb)/0.65)] bg-[rgb(var(--accent-rgb)/0.12)]" : "border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.06]"}`}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-xs font-black tabular-nums ${active ? "bg-[var(--accent)] text-black" : "bg-white/[0.06] text-white/45"}`}>{entry.number}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs font-extrabold ${active ? "text-white" : "text-white/75"}`}>{entry.title}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/30">
                            {type === "series" ? `S${season} · E${entry.number}` : `Episode ${entry.number}`}
                            {entry.runtime ? <span>· {entry.runtime}m</span> : null}
                          </span>
                        </span>
                        {active && <Check className="size-4 shrink-0 text-[var(--accent)]" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              ) : filteredEpisodes.length > 0 ? (
                <div className="space-y-3">
                  {filteredEpisodes.map((entry) => {
                    const active = entry.number === episode;
                    return (
                      <button
                        key={entry.number}
                        type="button"
                        onClick={() => selectEpisode(entry.number)}
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
