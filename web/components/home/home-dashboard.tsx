"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  CirclePlay,
  Compass,
  Library,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ReelItem } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { libraryItemHref } from "@/lib/library/item-href";
import { useLibrary, useLibraryStats } from "@/lib/library/use-library";
import { ForYouRow } from "@/components/home/for-you-row";
import { ProviderFeed } from "@/components/home/provider-feed";
import { PosterRow } from "@/components/discovery/poster-row";

type DashboardProps = {
  trending: UnifiedSearchResult[];
  generatedAt: number;
};

function resultHref(item: UnifiedSearchResult) {
  if (item.source === "tmdb" && item.tmdbId) return `/title/${item.type}/tmdb/${item.tmdbId}`;
  if (item.source === "anilist" && item.anilistId) return `/title/${item.type}/anilist/${item.anilistId}`;
  if (item.source === "anilist" && item.type === "anime" && item.malId) return `/title/anime/anilist/jikan-${item.malId}`;
  if (item.source === "mangadex" && item.mangadexId) return `/title/${item.type}/mangadex/${item.mangadexId}`;
  return `/search?q=${encodeURIComponent(item.title)}`;
}

function progressLabel(item: ReelItem) {
  if (item.type === "movie") {
    const minute = item.progress.movieTimestamp ?? 0;
    return minute > 0 ? `${minute} min` : "Ready to start";
  }
  if (item.type === "series" || item.type === "anime") {
    const episode = item.progress.currentEpisode ?? 0;
    const season = item.progress.currentSeason;
    return season ? `S${season} · E${episode}` : `Episode ${episode}`;
  }
  if (item.type === "comic") return `Issue ${item.progress.currentIssueNumber ?? "—"}`;
  return `Chapter ${item.progress.currentChapter ?? 0}`;
}

function progressPercent(item: ReelItem) {
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

export function HomeDashboard({ trending, generatedAt }: DashboardProps) {
  const { items, loading, signedIn } = useLibrary();
  const stats = useLibraryStats(items);
  const spotlightSlides = useMemo(
    () => trending.filter((item) => Boolean(item.backdropUrl ?? item.posterUrl)).slice(0, 6),
    [trending],
  );
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const active = items
    .filter((item) => item.status === "watching" || item.status === "rewatching" || item.status === "reading")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const continueWatching = active.filter((item) => item.type === "movie" || item.type === "series" || item.type === "anime");
  const planned = items
    .filter((item) => item.status === "planned")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const safeSpotlightIndex = spotlightSlides.length > 0 ? spotlightIndex % spotlightSlides.length : 0;
  const spotlight = spotlightSlides[safeSpotlightIndex] ?? trending[0] ?? null;
  const heroArtwork = spotlight?.backdropUrl ?? spotlight?.posterUrl ?? null;

  useEffect(() => {
    if (spotlightSlides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("pb-reduce-motion")) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % spotlightSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [spotlightSlides]);

  const showSpotlight = (index: number) => {
    setSpotlightIndex(index);
  };

  const activeIds = new Set(active.map((item) => item.id));
  const nextBest = [...active, ...planned]
    .sort((a, b) => {
      const activeA = activeIds.has(a.id) ? 1 : 0;
      const activeB = activeIds.has(b.id) ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return progressPercent(b) - progressPercent(a);
    })
    .slice(0, 5);

  return (
    <div className="pb-home-dashboard space-y-10 pb-8">
      <section className="relative -mx-3 min-h-[430px] overflow-hidden rounded-[26px] sm:-mx-4 sm:min-h-[500px] sm:rounded-[30px] lg:min-h-[570px]">
        {heroArtwork && (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-[1.025] bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url("${heroArtwork}")` }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,13,.82)_0%,rgba(7,8,13,.52)_42%,rgba(7,8,13,.10)_76%,transparent_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,8,13,.72)_0%,transparent_48%,rgba(7,8,13,.08)_100%)]" />
        <div className="relative z-10 flex min-h-[430px] items-end p-5 sm:min-h-[500px] sm:p-9 lg:min-h-[570px] lg:p-14">
          <div className="max-w-3xl pb-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              <Sparkles className="size-3.5" /> Spotlight
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[.98] tracking-[-0.045em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.55)] sm:text-6xl lg:text-7xl">
              {spotlight?.title ?? "Your stories, all in one place"}
            </h1>
            {spotlight ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/80 sm:text-base">
                <span>{mediaTypeLabel(spotlight.type)}</span>
                {spotlight.year && <><span className="text-white/45">•</span><span>{spotlight.year}</span></>}
                <span className="text-white/45">•</span>
                <span>Trending now</span>
              </div>
            ) : (
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                Track films, series, anime, manga and comics in one place, down to the episode, chapter, issue or minute.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {spotlight && (
                <Link href={resultHref(spotlight)} className="pb-uiverse-button pb-uiverse-button--light inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold">
                  <CirclePlay className="size-4" /> View details
                </Link>
              )}
              <Link href="/browse" className="pb-uiverse-button pb-uiverse-button--glass inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white">
                <Compass className="size-4" /> Discover more
              </Link>
            </div>
            {spotlightSlides.length > 1 && (
              <div className="mt-7 flex items-center gap-2" aria-label="Spotlight slides">
                {spotlightSlides.map((item, index) => (
                  <button
                    key={`${item.source}-${item.id}`}
                    type="button"
                    aria-label={`Show ${item.title}`}
                    aria-current={index === safeSpotlightIndex ? "true" : undefined}
                    onClick={() => showSpotlight(index)}
                    className={`pb-spotlight-dot${index === safeSpotlightIndex ? " is-active" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {signedIn && (
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
      )}

      <section>
        <SectionHeading eyebrow="Back to your stories" title="Continue watching" action="Your library" href="/library" />
        {!signedIn ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice rounded-2xl p-6 text-sm text-[var(--text-secondary)]">
            Sign in to sync exact progress across your library. You can still explore everything below.
          </div>
        ) : continueWatching.length === 0 ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice grid gap-4 rounded-2xl p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="font-semibold text-[var(--text)]">Nothing waiting to resume yet.</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Start a movie or show and Pandora’s Box will keep the exact point here.</p></div>
            <Link href="/search" className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white"><Plus className="size-4" /> Add your first title</Link>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-3 sm:gap-4">
              {continueWatching.slice(0, 10).map((item) => {
                const artwork = item.backdropUrl ?? item.posterUrl;
                return (
                  <article key={item.id} className="pb-continue-card group relative w-[78vw] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-[22px] sm:w-[340px] md:w-[370px] lg:w-[390px]">
                    <Link href={libraryItemHref(item)} className="block">
                      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-elevated)]">
                        {artwork ? (
                          <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]" style={{ backgroundImage: `url(\"${artwork}\")` }} />
                        ) : (
                          <div className="grid size-full place-items-center px-6 text-center font-display text-lg font-bold text-[var(--text-muted)]">{item.title}</div>
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,8,13,.92)_0%,rgba(7,8,13,.24)_58%,rgba(7,8,13,.04)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                            <span>{mediaTypeLabel(item.type)}</span><span>•</span><span>{progressLabel(item)}</span>
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
      </section>

      <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura rounded-[24px] p-5 sm:p-6">
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
      </section>

      <ProviderFeed />

      <ForYouRow />

      <PosterRow
        title="Trending now"
        subtitle="A mixed snapshot of movies, TV, anime and manga people are into right now"
        items={trending}
        viewAllHref="/browse"
        quickLook
      />

    </div>
  );
}
