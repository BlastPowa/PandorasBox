"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UnifiedSearchResult } from "@core/utils/search";
import { STREAMING_PROVIDERS } from "@/lib/streaming-providers";
import { PosterCard } from "./poster-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";

type Kind = "movie" | "tv";

export function ProviderSwitcher({
  initialProvider = "netflix",
  initialResults = [],
}: {
  initialProvider?: string;
  initialResults?: UnifiedSearchResult[];
}) {
  const [slug, setSlug] = useState(initialProvider);
  const [kind, setKind] = useState<Kind>("movie");
  const [results, setResults] = useState<UnifiedSearchResult[]>(initialResults);
  const [loading, setLoading] = useState(false);

  // Skip the fetch on first paint — the server already gave us the initial
  // provider's movie results, so refetching them would just flash a skeleton.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/provider?slug=${encodeURIComponent(slug)}&kind=${kind}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json) => setResults(Array.isArray(json.results) ? json.results : []))
      .catch((e) => {
        if (e.name !== "AbortError") setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, kind]);

  const active = STREAMING_PROVIDERS.find((p) => p.slug === slug);

  return (
    <section className="glass space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Streaming Services</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Popular on {active?.name ?? "your provider"} right now
          </p>
        </div>

        <div className="flex rounded-full border border-[var(--border)] bg-[var(--bg-base)] p-0.5">
          {(["movie", "tv"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                kind === k
                  ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)]"
              )}
            >
              {k === "movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STREAMING_PROVIDERS.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSlug(p.slug)}
            aria-pressed={slug === p.slug}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200",
              slug === p.slug
                ? "border-[var(--accent)] bg-[var(--glass-strong)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)]"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="-mx-1 flex gap-3 overflow-hidden px-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <PosterSkeleton key={i} className="w-[var(--poster-w-sm)] shrink-0 sm:w-[var(--poster-w)]" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          Nothing found on {active?.name} for {kind === "movie" ? "movies" : "TV shows"} right now.
        </p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {results.map((item) => (
            <PosterCard
              key={item.id}
              item={item}
              className="w-[var(--poster-w-sm)] shrink-0 snap-start sm:w-[var(--poster-w)]"
            />
          ))}
        </div>
      )}

      {active && (
        <Link
          href={`/browse/streaming-${active.slug}`}
          className="inline-block text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          View all on {active.name} →
        </Link>
      )}
    </section>
  );
}
