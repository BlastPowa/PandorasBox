"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, BarChart3, CalendarDays, ChevronRight, Search, Sparkles, Star, Trophy } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { SearchInput } from "@/components/ui-fx/input";
import { Spinner, EmptyState } from "@/components/ui-fx/feedback";
import type { ResolvedRatingsTarget, OmdbEpisodeRating } from "@/lib/imdb-ratings";
import { cn } from "@/lib/utils";

function ratingTone(rating: number | null): string {
  if (rating === null) return "text-[var(--text-muted)]";
  if (rating >= 9) return "text-[#22d3ee]";
  if (rating >= 8) return "text-[var(--completed)]";
  if (rating >= 7) return "text-[var(--gold)]";
  if (rating >= 5) return "text-orange-400";
  return "text-[var(--dropped)]";
}

export function EpisodeRatingsView({ explore }: { explore: UnifiedSearchResult[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UnifiedSearchResult | null>(null);
  const [target, setTarget] = useState<ResolvedRatingsTarget | null>(null);
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState<OmdbEpisodeRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearchChange(value: string) {
    setQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results: UnifiedSearchResult[] };
        setResults(json.results.filter((r) => r.type === "series" || r.type === "anime"));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function selectTitle(item: UnifiedSearchResult) {
    setSelected(item);
    setResults(null);
    setQuery("");
    setLoading(true);
    setNotFound(false);
    setEpisodes([]);
    try {
      const params = new URLSearchParams({
        source: item.source === "anilist" ? "anilist" : "tmdb",
        title: item.title,
      });
      if (item.tmdbId !== null) params.set("tmdbId", String(item.tmdbId));
      const res = await fetch(`/api/episode-ratings/resolve?${params.toString()}`);
      const json = (await res.json()) as { target: ResolvedRatingsTarget | null };
      if (!json.target) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTarget(json.target);
      setSeason(1);
      await loadSeason(json.target.imdbId, 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load ratings");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadSeason(imdbId: string, s: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/episode-ratings/season?imdbId=${imdbId}&season=${s}`);
      const json = (await res.json()) as { episodes: OmdbEpisodeRating[] };
      setEpisodes(json.episodes);
    } catch {
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setSelected(null);
    setTarget(null);
    setEpisodes([]);
    setNotFound(false);
  }

  const displayList = results ?? explore;
  const ratedEpisodes = episodes.filter((episode) => episode.imdbRating !== null);
  const average = ratedEpisodes.length > 0
    ? ratedEpisodes.reduce((sum, episode) => sum + (episode.imdbRating ?? 0), 0) / ratedEpisodes.length
    : null;
  const rankedEpisodes = [...ratedEpisodes].sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0));
  const bestEpisode = rankedEpisodes[0] ?? null;
  const lowestEpisode = rankedEpisodes.at(-1) ?? null;
  const scoreSpread = bestEpisode?.imdbRating !== null && bestEpisode && lowestEpisode?.imdbRating !== null && lowestEpisode
    ? bestEpisode.imdbRating - lowestEpisode.imdbRating
    : null;

  if (selected) {
    return (
      <div className="space-y-5 pb-8">
        <button onClick={back} className="pb-uiverse-button inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]">
          <ArrowLeft className="size-4" /> Back to search
        </button>

        <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura overflow-hidden rounded-[24px] p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative mx-auto h-52 w-36 shrink-0 overflow-hidden rounded-[18px] bg-[var(--bg-elevated)] shadow-xl sm:mx-0">
            {selected.posterUrl && <Image src={selected.posterUrl} alt={selected.title} fill sizes="128px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">
              <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.1)] px-2.5 py-1">{selected.type === "anime" ? "Anime" : "TV series"}</span>
              {selected.year !== null && <span className="text-[var(--text-muted)]">{selected.year}</span>}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{target?.matchedTitle ?? selected.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Compare every rated episode in the selected season, spot the peaks and dips, and move between seasons without leaving the guide.
            </p>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : notFound ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No IMDb episode data available for this title — it may not have an IMDb listing, or the OMDb key
                isn&apos;t configured yet.
              </p>
            ) : (
              target && (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <div className="pb-uiverse-row rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Seasons</p>
                      <p className="mt-1 font-display text-xl font-bold">{target.totalSeasons}</p>
                    </div>
                    <div className="pb-uiverse-row rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Season average</p>
                      <p className={`mt-1 font-display text-xl font-bold ${ratingTone(average)}`}>{average !== null ? average.toFixed(2) : "—"}</p>
                    </div>
                    <div className="pb-uiverse-row rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Rated episodes</p>
                      <p className="mt-1 font-display text-xl font-bold">{ratedEpisodes.length}<span className="text-sm text-[var(--text-muted)]">/{episodes.length}</span></p>
                    </div>
                    <div className="pb-uiverse-row rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Score spread</p>
                      <p className="mt-1 font-display text-xl font-bold">{scoreSpread !== null ? scoreSpread.toFixed(1) : "—"}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">Jump to season</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {Array.from({ length: target.totalSeasons }, (_, i) => i + 1).map((seasonNumber) => (
                        <button
                          key={seasonNumber}
                          onClick={() => {
                            setSeason(seasonNumber);
                            void loadSeason(target.imdbId, seasonNumber);
                          }}
                          className={cn(
                            "h-9 shrink-0 rounded-xl border px-3 text-xs font-bold transition",
                            season === seasonNumber
                              ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[rgb(var(--accent-rgb)/0.25)]"
                          )}
                        >
                          S{seasonNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )
            )}
          </div>
          </div>
        </section>

        {!loading && target && !notFound && episodes.length > 0 && (
          <>
            <section className="grid gap-3 md:grid-cols-2">
              {bestEpisode && (
                <div className="pb-uiverse-card pb-aura rounded-[20px] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--gold)]"><Trophy className="size-4" /> Season peak</div>
                      <h3 className="mt-2 font-display text-lg font-bold">E{bestEpisode.episode} · {bestEpisode.title}</h3>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{bestEpisode.released ?? "Air date unavailable"}</p>
                    </div>
                    <span className={`flex items-center gap-1 font-display text-2xl font-bold ${ratingTone(bestEpisode.imdbRating)}`}><Star className="size-5 fill-current" /> {bestEpisode.imdbRating?.toFixed(1)}</span>
                  </div>
                </div>
              )}
              {lowestEpisode && (
                <div className="pb-uiverse-card rounded-[20px] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)]"><BarChart3 className="size-4" /> Season low</div>
                      <h3 className="mt-2 font-display text-lg font-bold">E{lowestEpisode.episode} · {lowestEpisode.title}</h3>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{lowestEpisode.released ?? "Air date unavailable"}</p>
                    </div>
                    <span className={`flex items-center gap-1 font-display text-2xl font-bold ${ratingTone(lowestEpisode.imdbRating)}`}><Star className="size-5 fill-current" /> {lowestEpisode.imdbRating?.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="pb-uiverse-card overflow-hidden rounded-[22px]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Season {season}</p>
                  <h3 className="mt-1 font-display text-xl font-bold">Episode scorecard</h3>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Ratings sourced live from IMDb via OMDb.</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {episodes.map((episode) => (
                  <div key={episode.episode} className="grid gap-3 px-4 py-4 transition hover:bg-[rgb(var(--accent-rgb)/0.035)] sm:grid-cols-[52px_minmax(0,1fr)_170px] sm:items-center sm:px-5">
                    <div className="flex items-center justify-between sm:block">
                      <span className="font-mono text-xs font-bold text-[var(--text-muted)]">E{episode.episode}</span>
                      <span className={`flex items-center gap-1 font-mono text-sm font-bold sm:hidden ${ratingTone(episode.imdbRating)}`}><Star className="size-3 fill-current" /> {episode.imdbRating?.toFixed(1) ?? "—"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)]">{episode.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><CalendarDays className="size-3.5" /> {episode.released ?? "Air date unavailable"}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">IMDb</span>
                        <span className={`flex items-center gap-1 font-mono text-sm font-bold ${ratingTone(episode.imdbRating)}`}><Star className="size-3 fill-current" /> {episode.imdbRating?.toFixed(1) ?? "—"}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, (episode.imdbRating ?? 0) * 10))}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-uiverse-card pb-uiverse-card--feature pb-aura mx-auto max-w-3xl rounded-[22px] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="pb-uiverse-icon grid size-10 shrink-0 place-items-center rounded-xl text-[var(--accent)]"><Sparkles className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">Find a season worth revisiting</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Search any TV series or anime title, then compare its season average, peak episode and full IMDb score curve.</p>
            <div className="mt-4">
              <SearchInput
                icon={<Search className="size-4" />}
                placeholder="Search anime or TV shows…"
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {searching && <div className="flex justify-center py-4"><Spinner /></div>}

      {results !== null && !searching && results.length === 0 ? (
        <EmptyState icon={<Search className="size-10" />} title="No matches" description="Try a different title." />
      ) : (
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{results ? "Matches" : "Popular starting points"}</p>
              <h2 className="mt-1 font-display text-lg font-bold">{results ? "Search results" : "Explore episode scores"}</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{displayList.length} titles</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {displayList.map((item) => (
              <button key={item.id} onClick={() => void selectTitle(item)} className="pb-uiverse-card group overflow-hidden rounded-[18px] text-left transition hover:-translate-y-0.5">
                <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-elevated)]">
                  {item.posterUrl && (
                    <Image src={item.posterUrl} alt={item.title} fill sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
                  )}
                  {item.score !== null && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-[var(--gold)]">
                      <Star className="size-2.5 fill-current" /> {item.score.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-xs font-bold">{item.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                    <span>{item.type === "anime" ? "Anime" : "TV"}{item.year !== null ? ` · ${item.year}` : ""}</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
