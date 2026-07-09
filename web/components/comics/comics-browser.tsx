"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ComicSeries, Publisher } from "@/lib/comics-shared";
import { ComicCard } from "./comic-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";

const TABS: { value: Publisher; label: string }[] = [
  { value: "marvel", label: "Marvel" },
  { value: "dc", label: "DC" },
  { value: "image", label: "Image" },
  { value: "darkhorse", label: "Dark Horse" },
  { value: "idw", label: "IDW" },
];

export function ComicsBrowser({ initial }: { initial: ComicSeries[] }) {
  const [publisher, setPublisher] = useState<Publisher>("marvel");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [comics, setComics] = useState(initial);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const url =
      debounced.length >= 2
        ? `/api/comics?q=${encodeURIComponent(debounced)}`
        : `/api/comics?publisher=${publisher}`;
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setComics(Array.isArray(d.results) ? d.results : []))
      .catch((e) => {
        if (e.name !== "AbortError") setComics([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [publisher, debounced]);

  const searching = debounced.length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Comics</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Browse series across publishers — covers &amp; info from Comic Vine. We link out to legitimate reading platforms.
            </p>
          </div>
          <label className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all comics…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--glass)] py-2 pl-9 pr-9 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        {!searching && (
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setPublisher(t.value)}
                aria-pressed={publisher === t.value}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                  publisher === t.value
                    ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                    : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      ) : comics.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
          {searching ? `No comics found for “${debounced}”.` : "Couldn't load comics — Comic Vine may be temporarily unavailable."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {comics.map((c) => (
            <ComicCard key={c.id} comic={c} />
          ))}
        </div>
      )}
    </div>
  );
}
