"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dices, Sparkles } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { genresForType, type RandomType } from "@/lib/random-shared";
import { Pill } from "@/components/ui-fx/badge";
import { Button } from "@/components/ui-fx/button";
import { BoxLoader } from "@/components/ui-fx/box-loader";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";

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
  const [type, setType] = useState<RandomType>("any");
  const [genre, setGenre] = useState<string | null>(null);
  const genreOptions = genresForType(type);

  function changeType(next: RandomType) {
    setType(next);
    // drop the selected genre if it isn't valid for the new type
    if (genre && !genresForType(next).includes(genre)) setGenre(null);
  }
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult[] | null>(null);
  const [line, setLine] = useState(LOADING_LINES[0]);

  async function openBox() {
    setLoading(true);
    setResults(null);
    setLine(LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]);
    try {
      const params = new URLSearchParams({ type });
      if (genre) params.set("genre", genre);
      const res = await fetch(`/api/random?${params.toString()}`);
      const json = (await res.json()) as { results: UnifiedSearchResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResults(json.results);
      if (json.results.length === 0) toast.info("No matches — try a different genre or type.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the box");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="fx-glow-border glass rounded-[var(--radius-xl)] p-5 sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-[var(--gold)]" />
          <h2 className="font-display text-lg font-bold">Tune your box</h2>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Type</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Pill key={t.key} active={type === t.key} onClick={() => changeType(t.key)}>{t.label}</Pill>
          ))}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Genre (optional)</p>
        <div className="mb-6 flex flex-wrap gap-2">
          <Pill active={genre === null} onClick={() => setGenre(null)}>Any</Pill>
          {genreOptions.map((g) => (
            <Pill key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Pill>
          ))}
        </div>

        <Button size="lg" onClick={openBox} loading={loading} className="w-full sm:w-auto">
          <Dices className="size-5" /> Open the Box
        </Button>
      </div>

      {loading && <BoxLoader label={line} />}

      {!loading && results !== null && (
        results.length > 0 ? (
          <div className="fade-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Your picks</h3>
              <Button variant="glass" size="sm" onClick={openBox}><Dices className="size-4" /> Reshuffle</Button>
            </div>
            <PosterGrid items={results} />
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
