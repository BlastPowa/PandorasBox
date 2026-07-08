"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ANIME_SEASONS, seasonYears, type AnimeSeason } from "@/lib/anime";
import { cn } from "@/lib/utils";

/**
 * Season + year selector. Anime is browsed by broadcast season ("Summer 2026"),
 * but long-running shows span years, so both axes are offered together.
 * State lives in the URL so a season is linkable and survives refresh.
 */
export function SeasonPicker({ season, year }: { season: AnimeSeason; year: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    startTransition(() => router.push(`/anime?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", pending && "opacity-60")}>
      <div className="flex rounded-full border border-[var(--border)] bg-[var(--bg-base)] p-0.5">
        {ANIME_SEASONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setParam("season", s.value)}
            aria-pressed={s.value === season}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
              s.value === season
                ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="anime-year">
        Year
      </label>
      <select
        id="anime-year"
        value={year}
        onChange={(e) => setParam("year", e.target.value)}
        className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-xs font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)]"
      >
        {seasonYears().map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
