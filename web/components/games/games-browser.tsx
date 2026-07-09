"use client";

import { useEffect, useRef, useState } from "react";
import type { GameCard as GameCardData, GameSort } from "@/lib/igdb";
import { GameCard } from "./game-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";

const TABS: { value: GameSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "new", label: "New Releases" },
  { value: "upcoming", label: "Upcoming" },
];

export function GamesBrowser({ initial }: { initial: GameCardData[] }) {
  const [sort, setSort] = useState<GameSort>("popular");
  const [games, setGames] = useState(initial);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/games?sort=${sort}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setGames(Array.isArray(d.results) ? d.results : []))
      .catch((e) => {
        if (e.name !== "AbortError") setGames([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Games</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Discover games — powered by IGDB. Links out to Steam &amp; official stores.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSort(t.value)}
              aria-pressed={sort === t.value}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                sort === t.value
                  ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
          No games found. IGDB may be unavailable — check the IGDB keys in your environment.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
