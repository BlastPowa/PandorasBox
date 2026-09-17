"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Dices, RefreshCw, RotateCcw, Sparkles, Star, X } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import {
  RANDOM_ERAS,
  RANDOM_QUALITY,
  genresForType,
  type RandomType,
  type GenreMode,
  type RandomEra,
  type RandomQuality,
} from "@/lib/random-shared";
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

const PRESETS: {
  label: string;
  description: string;
  type: RandomType;
  genres: string[];
  era: RandomEra;
  quality: RandomQuality;
}[] = [
  { label: "Movie night", description: "Recent, well-rated thrillers", type: "movie", genres: ["Thriller"], era: "2020s", quality: "7" },
  { label: "Anime gem", description: "Top-tier fantasy anime", type: "anime", genres: ["Fantasy"], era: "any", quality: "8" },
  { label: "Comfort watch", description: "2000s comedy series", type: "series", genres: ["Comedy"], era: "2000s", quality: "7" },
  { label: "K-drama romance", description: "Well-rated Korean romance", type: "kdrama", genres: ["Romance"], era: "any", quality: "7" },
  { label: "Sci-fi rush", description: "Modern sci-fi movies with strong ratings", type: "movie", genres: ["Sci-Fi"], era: "2020s", quality: "7" },
  { label: "Mystery binge", description: "2010s mystery series worth a weekend", type: "series", genres: ["Mystery"], era: "2010s", quality: "7" },
  { label: "Anime action", description: "High-energy action anime across every era", type: "anime", genres: ["Action"], era: "any", quality: "7" },
  { label: "Manga starter", description: "Well-rated adventure manga", type: "manga", genres: ["Adventure"], era: "any", quality: "7" },
  { label: "Classic cinema", description: "Pre-2000 drama films", type: "movie", genres: ["Drama"], era: "classic", quality: "7" },
  { label: "K-drama mystery", description: "Korean mystery series with solid ratings", type: "kdrama", genres: ["Mystery"], era: "any", quality: "7" },
  { label: "Fantasy binge", description: "Fantasy TV from the 2010s", type: "series", genres: ["Fantasy"], era: "2010s", quality: "7" },
  { label: "Anime comfort", description: "Relaxed slice-of-life anime", type: "anime", genres: ["Slice of Life"], era: "any", quality: "7" },
];

const QUICK_PICK_COUNT = 4;

function pickQuickPicks(excludeLabel?: string) {
  const pool = PRESETS.filter((item) => item.label !== excludeLabel);
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, QUICK_PICK_COUNT);
}

const VALID_TYPES = new Set(TYPES.map((item) => item.key));
const VALID_ERAS = new Set(RANDOM_ERAS.map((item) => item.key));
const VALID_QUALITY = new Set(RANDOM_QUALITY.map((item) => item.key));

export function Randomizer({ preset }: { preset?: { type?: string; genres?: string; era?: string; quality?: string; mode?: string } }) {
  const reducedMotion = useReducedMotion();
  const presetType = preset?.type && VALID_TYPES.has(preset.type as RandomType) ? (preset.type as RandomType) : "any";
  const presetGenres = (preset?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter((genre) => genresForType(presetType).includes(genre));
  const [type, setType] = useState<RandomType>(presetType);
  const [genres, setGenres] = useState<string[]>(presetGenres);
  const [mode, setMode] = useState<GenreMode>(preset?.mode === "all" ? "all" : "any");
  const [era, setEra] = useState<RandomEra>(preset?.era && VALID_ERAS.has(preset.era as RandomEra) ? (preset.era as RandomEra) : "any");
  const [quality, setQuality] = useState<RandomQuality>(preset?.quality && VALID_QUALITY.has(preset.quality as RandomQuality) ? (preset.quality as RandomQuality) : "any");
  const [quickPicks, setQuickPicks] = useState(() => PRESETS.slice(0, QUICK_PICK_COUNT));
  const genreOptions = genresForType(type);

  function randomizeQuickPicks(excludeLabel?: string) {
    setQuickPicks(pickQuickPicks(excludeLabel));
  }

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

  const resultSummary = useMemo(() => {
    if (!results?.length) return null;
    const counts = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
    const scored = results.filter((item) => item.score !== null);
    const average = scored.length > 0 ? scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length : null;
    return { counts, average };
  }, [results]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setType(preset.type);
    setGenres(preset.genres);
    setMode("any");
    setEra(preset.era);
    setQuality(preset.quality);
    setResults(null);
  }

  function resetFilters() {
    setType("any");
    setGenres([]);
    setMode("any");
    setEra("any");
    setQuality("any");
    setResults(null);
  }

  async function openBox() {
    setLoading(true);
    setResults(null);
    setLine(LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]);
    try {
      const params = new URLSearchParams({ type, mode, era, quality });
      if (genres.length > 0) params.set("genres", genres.join(","));
      const res = await fetch(`/api/random?${params.toString()}`);
      const json = (await res.json()) as { results: UnifiedSearchResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResults(json.results);
      setReveal((value) => value + 1);
      randomizeQuickPicks();
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
      <section className="space-y-2">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => randomizeQuickPicks()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--glass)] hover:text-[var(--text)]"
            aria-label="Shuffle quick pick filters"
          >
            <RefreshCw className="size-3.5" /> Shuffle picks
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickPicks.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="glass group rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.45)]"
            >
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Quick pick</span>
              <span className="mt-2 block font-display text-base font-bold text-[var(--text)]">{preset.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="fx-glow-border glass rounded-[var(--radius-xl)] p-3 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--gold)]" />
            <h2 className="font-display text-lg font-bold">Tune your box</h2>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]">
            <RotateCcw className="size-3.5" /> Reset
          </button>
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

        <div className="mb-5 grid gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <CalendarDays className="size-3.5" /> Era
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {RANDOM_ERAS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setEra(option.key)}
                  title={option.hint}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${era === option.key ? "border-[rgb(var(--accent-rgb)/0.55)] bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Star className="size-3.5" /> Quality
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {RANDOM_QUALITY.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setQuality(option.key)}
                  title={option.hint}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${quality === option.key ? "border-[rgb(var(--gold-rgb)/0.55)] bg-[rgb(var(--gold-rgb)/0.12)] text-[var(--gold)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold">Your picks</h3>
                {resultSummary && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>{results.length} matches</span>
                    {Object.entries(resultSummary.counts).map(([key, count]) => <span key={key}>{count} {key}</span>)}
                    {resultSummary.average !== null && <span className="text-[var(--gold)]">★ {resultSummary.average.toFixed(1)} avg</span>}
                  </div>
                )}
              </div>
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
