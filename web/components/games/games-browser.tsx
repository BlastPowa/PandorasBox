"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { GameCard as GameCardData, GameSort } from "@/lib/igdb";
import { GameCard } from "./game-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { SearchInput } from "@/components/ui-fx/input";
import { cn } from "@/lib/utils";

const TABS: { value: GameSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "new", label: "New Releases" },
  { value: "upcoming", label: "Upcoming" },
];

export function GamesBrowser({ initial }: { initial: GameCardData[] }) {
  const [sort, setSort] = useState<GameSort>("popular");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [games, setGames] = useState(initial);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const url =
      debouncedQuery.length >= 2
        ? `/api/games?q=${encodeURIComponent(debouncedQuery)}`
        : `/api/games?sort=${sort}`;
    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setGames(Array.isArray(data.results) ? data.results : []))
      .catch((error) => {
        if (error.name !== "AbortError") setGames([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sort, debouncedQuery]);

  const searching = debouncedQuery.length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Games</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Discover games — powered by IGDB. Links out to Steam &amp; official stores.
          </p>
        </div>
        <SearchInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search games…"
          aria-label="Search games"
          icon={<Search className="size-4" aria-hidden="true" />}
          trailing={
            query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear game search"
                className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null
          }
          className="sm:w-80"
        />
      </div>

      {!searching && (
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              aria-pressed={sort === tab.value}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                sort === tab.value
                  ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {searching && !loading && games.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          Search results for “{debouncedQuery}”
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]" aria-live="polite">
          {searching
            ? `No games found for “${debouncedQuery}”.`
            : "No games found. IGDB may be unavailable — check the IGDB keys in your environment."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
