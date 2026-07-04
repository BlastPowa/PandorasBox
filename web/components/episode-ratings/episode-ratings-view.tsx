"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Search, Star, ArrowLeft } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { SearchInput } from "@/components/ui-fx/input";
import { Spinner, EmptyState } from "@/components/ui-fx/feedback";
import type { ResolvedRatingsTarget, OmdbEpisodeRating } from "@/lib/imdb-ratings";

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
  const average =
    episodes.length > 0
      ? episodes.filter((e) => e.imdbRating !== null).reduce((s, e) => s + (e.imdbRating ?? 0), 0) /
        (episodes.filter((e) => e.imdbRating !== null).length || 1)
      : null;

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]">
          <ArrowLeft className="size-4" /> Back to search
        </button>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative mx-auto h-44 w-32 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated)] sm:mx-0">
            {selected.posterUrl && <Image src={selected.posterUrl} alt={selected.title} fill sizes="128px" className="object-cover" />}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">{target?.matchedTitle ?? selected.title}</h2>
            {selected.year !== null && <p className="text-sm text-[var(--text-muted)]">{selected.year}</p>}

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
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {target.totalSeasons > 1 && (
                      <select
                        value={season}
                        onChange={(e) => {
                          const s = Number.parseInt(e.target.value, 10);
                          setSeason(s);
                          void loadSeason(target.imdbId, s);
                        }}
                        className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm"
                      >
                        {Array.from({ length: target.totalSeasons }, (_, i) => i + 1).map((s) => (
                          <option key={s} value={s}>Season {s}</option>
                        ))}
                      </select>
                    )}
                    {average !== null && (
                      <span className="glass rounded-full px-3 py-1.5 text-xs font-semibold">
                        Season average: <span className={ratingTone(average)}>{average.toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-surface)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2.5">Ep</th>
                          <th className="px-2 py-2.5">Rating</th>
                          <th className="px-2 py-2.5">Title</th>
                          <th className="px-2 py-2.5">Aired</th>
                        </tr>
                      </thead>
                      <tbody>
                        {episodes.length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--text-muted)]">No episode ratings found for this season.</td></tr>
                        ) : (
                          episodes.map((ep) => (
                            <tr key={ep.episode} className="border-t border-[var(--border)]">
                              <td className="px-3 py-2 font-mono text-xs text-[var(--text-muted)]">{ep.episode}</td>
                              <td className={`px-2 py-2 font-mono font-bold ${ratingTone(ep.imdbRating)}`}>
                                {ep.imdbRating !== null ? (
                                  <span className="flex items-center gap-1"><Star className="size-3 fill-current" /> {ep.imdbRating.toFixed(1)}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-2 py-2">{ep.title}</td>
                              <td className="px-2 py-2 text-xs text-[var(--text-muted)]">{ep.released ?? "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Ratings sourced live from IMDb via OMDb.</p>
                </>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl">
        <SearchInput
          icon={<Search className="size-4" />}
          placeholder="Search anime or TV shows…"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {searching && <div className="flex justify-center py-4"><Spinner /></div>}

      {results !== null && !searching && results.length === 0 ? (
        <EmptyState icon={<Search className="size-10" />} title="No matches" description="Try a different title." />
      ) : (
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">{results ? "Search results" : "Explore"}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {displayList.map((item) => (
              <button key={item.id} onClick={() => void selectTitle(item)} className="group text-left">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated)]">
                  {item.posterUrl && (
                    <Image src={item.posterUrl} alt={item.title} fill sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
                  )}
                  {item.score !== null && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-[var(--gold)]">
                      <Star className="size-2.5 fill-current" /> {item.score.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium">{item.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
