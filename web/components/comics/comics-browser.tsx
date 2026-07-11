"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ComicSeries, Publisher } from "@/lib/comics-shared";
import { ComicCard } from "./comic-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui-fx/input";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

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
        <DiscoveryPageHeader title="Comics" description="Browse series across major publishers with Comic Vine metadata and legitimate reading links." actions={<SearchInput
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all comics…"
              aria-label="Search comics"
              icon={<Search className="size-4" aria-hidden="true" />}
              trailing={query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear comic search"
                className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              ) : null}
              className="sm:w-80"
            />} />

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
