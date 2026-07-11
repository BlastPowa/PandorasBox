"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dices, Sparkles, X } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { genresForType, type RandomType, type GenreMode } from "@/lib/random-shared";
import { Pill } from "@/components/ui-fx/badge";
import { Button } from "@/components/ui-fx/button";
import { BoxLoader } from "@/components/ui-fx/box-loader";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const TYPES: { key: RandomType; label: string }[] = [
  { key: "any", label: "Surprise Me" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "TV & Series" },
  { key: "kdrama", label: "K-Drama" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Manga" },
];

const LOADING_LINES = [
  "Opening the box…",
  "Shuffling the multiverse…",
  "Consulting the oracle…",
  "Rolling the dice…",
];

export function Randomizer() {
  const reducedMotion = useReducedMotion();
  const [type, setType] = useState<RandomType>("any");
  const [genres, setGenres] = useState<string[]>([]);
  const [mode, setMode] = useState<GenreMode>("any");
  const genreOptions = genresForType(type);

  function changeType(next: RandomType) {
    setType(next);
    // drop any selected genres that aren't valid for the new type
    const valid = genresForType(next);
    setGenres((prev) => prev.filter((g) => valid.includes(g)));
  }

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult[] | null>(null);
  const [line, setLine] = useState(LOADING_LINES[0]);
  const [reveal, setReveal] = useState(0);

  async function openBox() {
    setLoading(true);
    setResults(null);
    setLine(LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]);
    try {
      const params = new URLSearchParams({ type, mode });
      if (genres.length > 0) params.set("genres", genres.join(","));
      const res = await fetch(`/api/random?${params.toString()}`);
      const json = (await res.json()) as { results: UnifiedSearchResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResults(json.results);
      setReveal((value) => value + 1);
      if (json.results.length === 0) toast.info("No matches — try a different genre or type.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the box");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-clip sm:space-y-6">
      <div className="fx-glow-border glass rounded-[var(--radius-xl)] p-3 sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-[var(--gold)]" />
          <h2 className="font-display text-lg font-bold">Tune your box</h2>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Type</p>
        <div className="mb-4 flex flex-wrap gap-1.5 sm:mb-5 sm:gap-2">
          {TYPES.map((t) => (
            <Pill key={t.key} active={type === t.key} onClick={() => changeType(t.key)}>{t.label}</Pill>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Genres (optional)</p>
          {genres.length > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-[var(--glass)] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("any")}
                className={`rounded-full px-2.5 py-1 transition-colors ${mode === "any" ? "bg-[var(--accent)] text-[#0a0a0f]" : "text-[var(--text-muted)]"}`}
              >
                Match Any
              </button>
              <button
                type="button"
                onClick={() => setMode("all")}
                className={`rounded-full px-2.5 py-1 transition-colors ${mode === "all" ? "bg-[var(--accent)] text-[#0a0a0f]" : "text-[var(--text-muted)]"}`}
              >
                Match All
              </button>
            </div>
          )}
        </div>

        {genres.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[#0a0a0f]"
              >
                {g} <X className="size-3" />
              </button>
            ))}
          </div>
        )}

        <div className="mb-5 max-h-32 overflow-y-auto overscroll-contain pr-1 sm:mb-6 sm:max-h-none sm:overflow-visible">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {genreOptions
            .filter((g) => !genres.includes(g))
            .map((g) => (
              <Pill key={g} active={false} onClick={() => toggleGenre(g)}>{g}</Pill>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={openBox} loading={loading} className="w-full sm:w-auto">
          <Dices className="size-5" /> Open the Box
        </Button>
      </div>

      {loading && <BoxLoader label={line} />}

      {!loading && results !== null && (
        results.length > 0 ? (
          <div key={reveal} className={`${reducedMotion ? "" : "pb-random-deck-reveal"} space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Your picks</h3>
              <Button variant="glass" size="sm" onClick={openBox}><Dices className="size-4" /> Reshuffle</Button>
            </div>
            <PosterGrid items={results} mobileColumns={2} />
          </div>
        ) : (
          <EmptyState
            icon={<Dices className="size-10" />}
            title="Nothing in the box"
            description="Try a broader genre, a different type, or make sure the TMDB key is set for movies & TV."
          />
        )
      )}

      {!loading && results === null && (
        <EmptyState
          icon={<Sparkles className="size-10" />}
          title="Feeling indecisive?"
          description="Pick a type and genre (or leave it on Surprise Me) and open the box for a fresh set of random picks across movies, TV, anime and manga."
        />
      )}
    </div>
  );
}
