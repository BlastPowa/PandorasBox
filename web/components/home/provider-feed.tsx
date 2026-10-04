"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Film, LoaderCircle, Tv } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { CinematicRail } from "@/components/home/cinematic-rail";
import { STREAMING_PROVIDERS, providerLogoUrl } from "@/lib/streaming-providers";

type ProviderKind = "movie" | "tv";
const PROVIDER_TINTS: Record<string, string> = {
  netflix: "229 9 20", "prime-video": "0 168 225", "disney-plus": "36 104 205",
  hulu: "28 231 131", max: "100 65 230", "paramount-plus": "0 100 255",
  crunchyroll: "244 117 33", peacock: "223 180 75", "apple-tv-plus": "140 150 160",
};

export function ProviderFeed() {
  const [slug, setSlug] = useState<string | null>("netflix");
  const [kind, setKind] = useState<ProviderKind>("movie");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayedKey, setDisplayedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const resultCache = useRef(new Map<string, UnifiedSearchResult[]>());

  useEffect(() => {
    if (!slug) return;

    const cacheKey = `${slug}:${kind}`;
    const cached = resultCache.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setDisplayedKey(cacheKey);
      setFailed(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`/api/provider?slug=${encodeURIComponent(slug)}&kind=${kind}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Provider request failed");
        return response.json() as Promise<{ results?: UnifiedSearchResult[] }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const nextResults = Array.isArray(payload.results) ? payload.results : [];
        resultCache.current.set(cacheKey, nextResults);
        setResults(nextResults);
        setDisplayedKey(cacheKey);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [kind, slug, retryAttempt]);

  const selectedProvider = STREAMING_PROVIDERS.find((provider) => provider.slug === slug) ?? null;
  const [displayedSlug, displayedKind] = (displayedKey ?? `${slug}:${kind}`).split(":");
  const activeProvider = STREAMING_PROVIDERS.find((provider) => provider.slug === displayedSlug) ?? selectedProvider;

  return (
    <section className="pb-provider-feed pb-fluid-provider-feed space-y-4" aria-label="Browse by streaming provider" style={{ "--provider-rgb": PROVIDER_TINTS[slug ?? ""] ?? "var(--accent-rgb)" } as CSSProperties}>
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
                  if (!selected) setSlug(provider.slug);
                  else if (failed) setRetryAttempt(value => value + 1);
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
        <div className="pb-cinema-provider-results">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="flex items-center gap-3">{activeProvider && <span className="relative size-11 shrink-0 overflow-hidden rounded-xl"><Image src={providerLogoUrl(activeProvider)} alt="" fill sizes="44px" className="object-cover" /></span>}<div><p className="pb-cinema-eyebrow">Popular {displayedKind === "movie" ? "movies" : "shows"} on</p><p className="text-base font-bold text-[var(--text)]">{activeProvider?.name}</p></div></div>

            </div>
            {activeProvider && (
              <Link href={`/browse/streaming-${activeProvider.slug}`} className="shrink-0 text-xs font-bold text-[var(--accent)] hover:underline">
                View all
              </Link>
            )}
          </div>

          <div className="pb-provider-stage" aria-busy={loading}>
            <p className="pb-provider-load-status" role="status" aria-live="polite">
              {loading ? <><LoaderCircle className="size-3.5 animate-spin" /> Loading {kind === "movie" ? "movies" : "shows"} on {selectedProvider?.name}…</> : failed ? "Couldn’t load this provider. Select it again to retry, or choose another." : ""}
            </p>
            {results.length > 0 ? (
              <div key={displayedKey} className={`pb-provider-row ${loading ? "is-loading" : "is-ready"}`}>
                <CinematicRail title={`Popular ${displayedKind === "movie" ? "movies" : "shows"} on ${activeProvider?.name}`} items={results.slice(0, 14)} />
              </div>
            ) : loading ? (
              <div className="pb-provider-skeletons" aria-hidden="true">{Array.from({length:5}, (_,index) => <div key={index}><div className="skeleton aspect-video rounded-xl" /><div className="skeleton mt-3 h-4 w-3/4 rounded" /><div className="skeleton mt-2 h-3 w-1/2 rounded" /></div>)}</div>
            ) : !failed && <p className="py-12 text-center text-sm text-[var(--text-muted)]">No titles found for this provider right now.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
