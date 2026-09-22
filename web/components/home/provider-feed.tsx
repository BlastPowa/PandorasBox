"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Film, LoaderCircle, Tv } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterCard } from "@/components/discovery/poster-card";
import { STREAMING_PROVIDERS, providerLogoUrl } from "@/lib/streaming-providers";

type ProviderKind = "movie" | "tv";

export function ProviderFeed() {
  const [slug, setSlug] = useState<string | null>(null);
  const [kind, setKind] = useState<ProviderKind>("movie");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const resultCache = useRef(new Map<string, UnifiedSearchResult[]>());

  useEffect(() => {
    if (!slug) return;

    const cacheKey = `${slug}:${kind}`;
    const cached = resultCache.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/provider?slug=${encodeURIComponent(slug)}&kind=${kind}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Provider request failed");
        return response.json() as Promise<{ results?: UnifiedSearchResult[] }>;
      })
      .then((payload) => {
        const nextResults = Array.isArray(payload.results) ? payload.results : [];
        resultCache.current.set(cacheKey, nextResults);
        setResults(nextResults);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [kind, slug]);

  const activeProvider = STREAMING_PROVIDERS.find((provider) => provider.slug === slug) ?? null;

  return (
    <section className="pb-provider-feed space-y-4" aria-label="Browse by streaming provider">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Streaming services</p>
          <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-[var(--text)] sm:text-2xl">Browse by provider</h2>
        </div>
        <div className="flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] p-1 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setKind("movie");
            }}
            aria-pressed={kind === "movie"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${kind === "movie" ? "bg-[var(--text)] text-[var(--bg-base)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
          >
            <Film className="size-3.5" /> Movies
          </button>
          <button
            type="button"
            onClick={() => {
              setKind("tv");
            }}
            aria-pressed={kind === "tv"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${kind === "tv" ? "bg-[var(--text)] text-[var(--bg-base)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
          >
            <Tv className="size-3.5" /> Shows
          </button>
        </div>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-3 sm:gap-4">
          {STREAMING_PROVIDERS.map((provider) => {
            const selected = provider.slug === slug;
            return (
              <button
                key={provider.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (selected) {
                    setSlug(null);
                    setResults([]);
                    setLoading(false);
                  } else {
                    setSlug(provider.slug);
                  }
                }}
                className={`pb-provider-tile group flex w-[78px] shrink-0 flex-col items-center gap-2 rounded-[20px] px-2 py-3 text-center transition sm:w-[88px] sm:px-3 ${selected ? "is-active" : ""}`}
              >
                <span className="relative grid size-12 place-items-center overflow-hidden rounded-[15px] bg-white shadow-sm sm:size-14">
                  <Image
                    src={providerLogoUrl(provider)}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
                <span className="line-clamp-2 min-h-8 text-[10px] font-semibold leading-4 text-[var(--text-secondary)] sm:text-[11px]">{provider.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {slug && (
        <div className="pb-provider-results rounded-[24px] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-bold text-[var(--text)]">Popular on {activeProvider?.name}</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{kind === "movie" ? "Movies" : "TV shows"} available through this provider</p>
            </div>
            {activeProvider && (
              <Link href={`/browse/streaming-${activeProvider.slug}`} className="shrink-0 text-xs font-bold text-[var(--accent)] hover:underline">
                View all
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid min-h-36 place-items-center text-[var(--text-muted)]"><LoaderCircle className="size-5 animate-spin" /></div>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">No titles found for this provider right now.</p>
          ) : (
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {results.slice(0, 14).map((item) => (
                <PosterCard key={`${item.source}-${item.id}`} item={item} quickLook className="w-[118px] shrink-0 snap-start sm:w-[142px] md:w-[156px]" />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
