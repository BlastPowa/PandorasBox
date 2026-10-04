"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Library,
  Plus,
} from "lucide-react";
import type { ReelItem } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { libraryItemHref } from "@/lib/library/item-href";
import { useLibrary, useLibraryStats } from "@/lib/library/use-library";
import { ForYouRow } from "@/components/home/for-you-row";
import { ProviderFeed } from "@/components/home/provider-feed";
import { CinematicSpotlight } from "@/components/home/cinematic-spotlight";
import { CinematicRail } from "@/components/home/cinematic-rail";

type DashboardProps = {
  trending: UnifiedSearchResult[];
  generatedAt: number;
  movies: UnifiedSearchResult[];
  series: UnifiedSearchResult[];
  anime: UnifiedSearchResult[];
  manga: UnifiedSearchResult[];
};

const EXTENSION_LIBRARY_CHANNEL = "__pbox_extension_library_v1__";

function isExtensionReelItem(value: unknown): value is ReelItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReelItem>;
  return typeof item.id === "string"
    && typeof item.title === "string"
    && typeof item.status === "string"
    && Boolean(item.progress && typeof item.progress === "object");
}

function hasResumeProgress(item: ReelItem) {
  if (item.type === "movie") return (item.progress.movieTimestamp ?? 0) > 0 || item.progress.percentComplete > 0;
  if (item.type === "series" || item.type === "anime") {
    return (item.progress.currentEpisode ?? 0) > 0
      || (item.progress.currentEpisodePercent ?? 0) > 0
      || (item.progress.episodeTimestamp ?? 0) > 0
      || item.progress.percentComplete > 0;
  }
  return false;
}

function itemIdentity(item: ReelItem) {
  return item.tmdbId != null ? `tmdb:${item.tmdbId}` : item.id;
}

function normalizedTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function progressLabel(item: ReelItem) {
  if (item.type === "movie") {
    const seconds = item.progress.movieTimestamp ?? 0;
    return seconds > 0 ? `${Math.max(1, Math.floor(seconds / 60))} min in` : "Ready to start";
  }
  if (item.type === "series" || item.type === "anime") {
    const episode = item.progress.currentEpisode ?? 0;
    const season = item.progress.currentSeason;
    const episodePercent = item.progress.currentEpisodePercent ?? 0;
    const position = season ? `S${season} · E${episode}` : `Episode ${episode}`;
    return episodePercent > 0 ? `${position} · ${Math.round(episodePercent)}%` : position;
  }
  if (item.type === "comic") return `Issue ${item.progress.currentIssueNumber ?? "—"}`;
  return `Chapter ${item.progress.currentChapter ?? 0}`;
}

function progressPercent(item: ReelItem) {
  if ((item.type === "series" || item.type === "anime") && (item.progress.currentEpisodePercent ?? 0) > 0) {
    return Math.max(0, Math.min(100, item.progress.currentEpisodePercent ?? 0));
  }
  if (Number.isFinite(item.progress.percentComplete)) {
    return Math.max(0, Math.min(100, item.progress.percentComplete));
  }
  if ((item.type === "series" || item.type === "anime") && item.totalEpisodes) {
    return Math.min(100, ((item.progress.currentEpisode ?? 0) / item.totalEpisodes) * 100);
  }
  if ((item.type === "manga" || item.type === "manhwa") && item.totalChapters) {
    return Math.min(100, ((item.progress.currentChapter ?? 0) / item.totalChapters) * 100);
  }
  return 0;
}

function mediaTypeLabel(type: ReelItem["type"] | UnifiedSearchResult["type"]) {
  if (type === "series") return "TV";
  if (type === "manhwa") return "Manhwa";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function updatedTime(value: string, generatedAt: number) {
  const elapsed = generatedAt - new Date(value).getTime();
  const days = Math.max(0, Math.floor(elapsed / 86_400_000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

function SectionHeading({
  eyebrow,
  title,
  action,
  href,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{eyebrow}</p>
        )}
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-[var(--text)] sm:text-2xl">{title}</h2>
      </div>
      {action && href && (
        <Link href={href} className="pb-uiverse-action-link flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--accent)]">
          {action}
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function HomeDashboard({ trending, generatedAt, movies, series, anime, manga }: DashboardProps) {
  const { items, loading, signedIn } = useLibrary();
  const stats = useLibraryStats(items);
  const [extensionItems, setExtensionItems] = useState<ReelItem[]>([]);
  const [resolvedContinueArtwork, setResolvedContinueArtwork] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as { channel?: string; type?: string; items?: unknown[] } | null;
      if (!message || message.channel !== EXTENSION_LIBRARY_CHANNEL || message.type !== "response" || !Array.isArray(message.items)) return;
      setExtensionItems(message.items.filter(isExtensionReelItem));
    };
    const request = () => window.postMessage({ channel: EXTENSION_LIBRARY_CHANNEL, type: "request" }, window.location.origin);
    window.addEventListener("message", receive);
    request();
    const retry = window.setTimeout(request, 1200);
    return () => {
      window.removeEventListener("message", receive);
      window.clearTimeout(retry);
    };
  }, []);

  const { active, continueWatching, planned } = useMemo(() => {
    const activeItems = items
      .filter((item) => item.status === "watching" || item.status === "rewatching" || item.status === "reading")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      active: activeItems,
      continueWatching: activeItems.filter((item) => item.type === "movie" || item.type === "series" || item.type === "anime"),
      planned: items
        .filter((item) => item.status === "planned")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    };
  }, [items]);
  const extensionContinueWatching = useMemo(() => extensionItems
    .filter((item) => (item.status === "watching" || item.status === "rewatching")
      && (item.type === "movie" || item.type === "series" || item.type === "anime")
      && hasResumeProgress(item))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [extensionItems]);

  const combinedContinueWatching = useMemo(() => {
    const merged = new Map<string, ReelItem>();
    for (const item of continueWatching) merged.set(itemIdentity(item), item);
    for (const item of extensionContinueWatching) {
      const key = itemIdentity(item);
      const existing = merged.get(key);
      if (!existing || new Date(item.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) merged.set(key, item);
    }
    return [...merged.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [continueWatching, extensionContinueWatching]);

  const extensionItemKeys = useMemo(() => new Set(extensionContinueWatching.map(itemIdentity)), [extensionContinueWatching]);

  useEffect(() => {
    const missing = combinedContinueWatching
      .filter((item) => !item.backdropUrl && !item.posterUrl && !(itemIdentity(item) in resolvedContinueArtwork))
      .slice(0, 10);
    if (missing.length === 0) return;

    const controller = new AbortController();
    void Promise.all(missing.map(async (item) => {
      const key = itemIdentity(item);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(item.title)}`, { signal: controller.signal });
        if (!response.ok) return [key, null] as const;
        const payload = await response.json() as { results?: UnifiedSearchResult[] };
        const results = Array.isArray(payload.results) ? payload.results : [];
        const exactId = item.tmdbId != null ? results.find((candidate) => candidate.tmdbId === item.tmdbId) : null;
        const titleKey = normalizedTitle(item.title);
        const exactTitle = results.find((candidate) => {
          const sameKind = candidate.type === item.type
            || ((item.type === "series" || item.type === "anime") && (candidate.type === "series" || candidate.type === "anime"));
          return sameKind && normalizedTitle(candidate.title) === titleKey;
        });
        const match = exactId ?? exactTitle;
        return [key, match?.backdropUrl ?? match?.posterUrl ?? null] as const;
      } catch {
        return [key, null] as const;
      }
    })).then((entries) => {
      if (controller.signal.aborted) return;
      setResolvedContinueArtwork((current) => {
        const next = { ...current };
        for (const [key, artwork] of entries) next[key] = artwork;
        return next;
      });
    });

    return () => controller.abort();
  }, [combinedContinueWatching, resolvedContinueArtwork]);

  const { activeIds, nextBest } = useMemo(() => {
    const ids = new Set(active.map((item) => item.id));
    return {
      activeIds: ids,
      nextBest: [...active, ...planned]
        .sort((a, b) => {
          const activeA = ids.has(a.id) ? 1 : 0;
          const activeB = ids.has(b.id) ? 1 : 0;
          if (activeA !== activeB) return activeB - activeA;
          return progressPercent(b) - progressPercent(a);
        })
        .slice(0, 5),
    };
  }, [active, planned]);

  return (
    <div className="pb-home-dashboard pb-cinema-home">
      <CinematicSpotlight items={trending} />
      <div className="pb-cinema-body">

      {(signedIn || combinedContinueWatching.length > 0) && <section>
        <SectionHeading eyebrow="Back to your stories" title="Continue watching" action="Your library" href="/library" />
        {!signedIn && combinedContinueWatching.length === 0 ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice rounded-2xl p-6 text-sm text-[var(--text-secondary)]">
            Sign in to sync exact progress across your library. You can still explore everything below.
          </div>
        ) : combinedContinueWatching.length === 0 ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice grid gap-4 rounded-2xl p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="font-semibold text-[var(--text)]">Nothing waiting to resume yet.</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Start a movie or show and Pandora’s Box will keep the exact point here.</p></div>
            <Link href="/search" className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white"><Plus className="size-4" /> Add your first title</Link>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-3 sm:gap-4">
              {combinedContinueWatching.slice(0, 10).map((item) => {
                const artwork = item.backdropUrl ?? item.posterUrl ?? resolvedContinueArtwork[itemIdentity(item)] ?? null;
                return (
                  <article key={item.id} className="pb-continue-card group relative w-[78vw] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-[22px] sm:w-[340px] md:w-[370px] lg:w-[390px]">
                    <Link href={libraryItemHref(item)} className="block">
                      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-elevated)]">
                        {artwork ? (
                          <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]" style={{ backgroundImage: `url(\"${artwork}\")` }} />
                        ) : (
                          <div aria-hidden="true" className="size-full bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.3),var(--bg-elevated))]" />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,8,13,.92)_0%,rgba(7,8,13,.24)_58%,rgba(7,8,13,.04)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                            <span>{mediaTypeLabel(item.type)}</span><span>•</span><span>{progressLabel(item)}</span>{extensionItemKeys.has(itemIdentity(item)) && <><span>•</span><span>Extension</span></>}
                          </div>
                          <h3 className="mt-1.5 line-clamp-1 font-display text-lg font-bold text-white sm:text-xl">{item.title}</h3>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.45)]" style={{ width: `${Math.max(2, progressPercent(item))}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] font-medium text-white/65">{Math.round(progressPercent(item))}% complete · {updatedTime(item.updatedAt, generatedAt)}</p>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>}


      <CinematicRail title="Top 10 movies" eyebrow="Trending today" items={movies.slice(0, 10)} href="/movies" ranked />
      <CinematicRail title="Top 10 shows" eyebrow="Trending today" items={series.slice(0, 10)} href="/tv" ranked />
      <ProviderFeed />

      <ForYouRow />

      <CinematicRail title="Trending anime" eyebrow="Animation & imagination" items={anime.slice(0, 12)} href="/anime" />
      <CinematicRail title="On your reading radar" eyebrow="One more chapter" items={manga.slice(0, 12)} href="/browse" />
      {signedIn && <>
        <section className="pb-uiverse-card rounded-[22px] p-4 sm:p-5" aria-label="Library summary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="pb-uiverse-icon grid size-10 shrink-0 place-items-center rounded-xl text-[var(--accent)]"><Library className="size-4" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Your library</p>
                <h2 className="mt-0.5 font-display text-base font-bold text-[var(--text)] sm:text-lg">Progress at a glance</h2>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-2 sm:max-w-2xl">
              {[
                { label: "Active", value: stats.watching },
                { label: "Planned", value: stats.planned },
                { label: "Done", value: stats.completed },
                { label: "Saved", value: stats.totalItems },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[var(--glass)] px-2 py-2.5 text-center">
                  <div className="font-display text-lg font-bold tabular-nums text-[var(--text)] sm:text-xl">{loading ? "—" : value}</div>
                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:text-[10px]">{label}</div>
                </div>
              ))}
            </div>
            <Link href="/stats" className="pb-uiverse-action-link inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold text-[var(--accent)]">
              Full stats <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>
      <details className="pb-cinema-personal"><summary>Your queue for tonight <ChevronRight className="size-4" /></summary><div className="pt-5">
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="What fits tonight?" title="Pick something for tonight" action="Open the Box" href="/randomize" />
            <p className="-mt-2 text-sm leading-6 text-[var(--text-secondary)]">A short list from what you already saved, prioritising things you have started and are closest to finishing.</p>
          </div>
          <div className="space-y-2">
            {nextBest.length === 0 ? (
              <Link href="/browse" className="pb-uiverse-row flex items-center justify-between rounded-xl p-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]">Explore titles to build your list <ArrowRight className="size-4" /></Link>
            ) : nextBest.map((item, index) => (
              <Link key={item.id} href={libraryItemHref(item)} className="pb-uiverse-row flex items-center gap-3 rounded-xl px-2 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgb(var(--accent-rgb)/0.12)] text-xs font-bold text-[var(--accent)]">{index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--text)]">{item.title}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{activeIds.has(item.id) ? `${Math.round(progressPercent(item))}% complete · keep momentum` : "Saved for later · ready when you are"}</p></div>
                <ChevronRight className="size-4 shrink-0 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </div>
      </div></details>
      </>}
      <footer className="pb-cinema-footer"><span className="font-display font-bold">Pandora’s Box</span><span>Your stories, all in one place.</span><div className="flex gap-5"><Link href="/browse">Discover</Link><Link href="/library">Library</Link><Link href="/faq">Help</Link></div></footer>
      </div>

    </div>
  );
}
