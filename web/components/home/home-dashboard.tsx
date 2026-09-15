"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  Clock3,
  Compass,
  Film,
  Library,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ReelItem } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { libraryItemHref } from "@/lib/library/item-href";
import { useLibrary, useLibraryStats } from "@/lib/library/use-library";
import { AmbientBackground, HERO_SLIDE_EVENT } from "@/components/home/ambient-background";
import { ForYouRow } from "@/components/home/for-you-row";

type DashboardProps = {
  trending: UnifiedSearchResult[];
  upcoming: UnifiedSearchResult[];
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

function Poster({ title, posterUrl }: { title: string; posterUrl: string | null }) {
  return posterUrl ? (
    <div
      className="h-full w-full bg-[var(--bg-elevated)] bg-cover bg-center"
      role="img"
      aria-label={`${title} poster`}
      style={{ backgroundImage: `url("${posterUrl}")` }}
    />
  ) : (
    <div className="grid h-full w-full place-items-center bg-[var(--bg-elevated)] px-3 text-center text-xs font-semibold text-[var(--text-muted)]">
      {title}
    </div>
  );
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

export function HomeDashboard({ trending, upcoming, generatedAt }: DashboardProps) {
  const { items, loading, signedIn, markEpisode, markChapter, updateProgress, setStatus } = useLibrary();
  const stats = useLibraryStats(items);
  const spotlightSlides = useMemo(
    () => trending.filter((item) => Boolean(item.backdropUrl ?? item.posterUrl)).slice(0, 6),
    [trending],
  );
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const active = items
    .filter((item) => item.status === "watching" || item.status === "rewatching" || item.status === "reading")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const planned = items
    .filter((item) => item.status === "planned")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const staleItems = active
    .filter((item) => generatedAt - new Date(item.updatedAt).getTime() > 21 * 86_400_000)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const stale = staleItems.length;
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

  useEffect(() => {
    if (heroArtwork) window.dispatchEvent(new CustomEvent(HERO_SLIDE_EVENT, { detail: heroArtwork }));
  }, [heroArtwork]);

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

  const checkIn = async (item: ReelItem) => {
    if (item.type === "series" || item.type === "anime") {
      await markEpisode(item.id, (item.progress.currentEpisode ?? 0) + 1, item.progress.currentSeason ?? undefined);
      return;
    }
    if (item.type === "manga" || item.type === "manhwa") {
      await markChapter(item.id, (item.progress.currentChapter ?? 0) + 1);
      return;
    }
    if (item.type === "comic") {
      const current = Number.parseInt(item.progress.currentIssueNumber ?? "0", 10) || 0;
      await updateProgress(item.id, {
        currentIssueNumber: String(current + 1),
        currentIssueId: item.progress.currentIssueId ?? null,
      });
      return;
    }
    await updateProgress(item.id, { movieTimestamp: (item.progress.movieTimestamp ?? 0) + 10 });
  };

  return (
    <div className="pb-home-dashboard space-y-10 pb-8">
      <AmbientBackground imageUrl={heroArtwork} />
      <section className="relative -mx-3 min-h-[470px] overflow-hidden rounded-[30px] sm:-mx-4 sm:min-h-[520px] lg:min-h-[570px]">
        {heroArtwork && (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-[1.025] bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url("${heroArtwork}")` }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,13,.82)_0%,rgba(7,8,13,.52)_42%,rgba(7,8,13,.10)_76%,transparent_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,8,13,.72)_0%,transparent_48%,rgba(7,8,13,.08)_100%)]" />
        <div className="relative z-10 flex min-h-[470px] items-end p-7 sm:min-h-[520px] sm:p-10 lg:min-h-[570px] lg:p-14">
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

      <section>
        <SectionHeading eyebrow="Now showing" title="Popular right now" action="Explore all" href="/browse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {trending.slice(0, 6).map((item) => (
            <Link key={`${item.source}-${item.id}`} href={resultHref(item)} className="pb-uiverse-media-card group min-w-0 rounded-[22px] p-2.5">
              <div className="pb-uiverse-media-card__poster aspect-[2/3] overflow-hidden rounded-[16px]"><Poster title={item.title} posterUrl={item.posterUrl} /></div>
              <div className="mt-2.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{item.type === "movie" ? <Film className="size-3" /> : item.type === "manga" || item.type === "manhwa" ? <BookOpen className="size-3" /> : <Compass className="size-3" />} {mediaTypeLabel(item.type)}</div>
              <p className="mb-1 mt-1 line-clamp-2 px-1 text-sm font-semibold leading-5 text-[var(--text)] group-hover:text-[var(--accent)]">{item.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In progress", value: stats.watching, icon: CirclePlay },
          { label: "Planned", value: stats.planned, icon: Target },
          { label: "Completed", value: stats.completed, icon: Check },
          { label: "Total saved", value: stats.totalItems, icon: Library },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="pb-uiverse-card pb-uiverse-card--stat rounded-2xl p-4 sm:p-5">
            <div className="pb-uiverse-icon mb-3 grid size-9 place-items-center rounded-xl text-[var(--accent)]"><Icon className="size-4" /></div>
            <div className="font-display text-2xl font-bold text-[var(--text)]">{loading ? "—" : value}</div>
            <div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{label}</div>
          </div>
        ))}
      </section>

      <section>
        <SectionHeading eyebrow="Continue watching & reading" title="Pick up where you left off" action="Your library" href="/library" />
        {!signedIn ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice rounded-2xl p-6 text-sm text-[var(--text-secondary)]">
            Sign in to sync exact progress across your library. You can still explore everything below.
          </div>
        ) : active.length === 0 ? (
          <div className="pb-uiverse-card pb-uiverse-card--notice grid gap-4 rounded-2xl p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="font-semibold text-[var(--text)]">Nothing in progress yet.</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Add a title, set it as in progress and Pandora’s Box will keep the exact point here.</p></div>
            <Link href="/search" className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white"><Plus className="size-4" /> Add your first title</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.slice(0, 6).map((item) => (
              <article key={item.id} className="pb-uiverse-card pb-uiverse-card--progress group grid grid-cols-[84px_1fr] overflow-hidden rounded-2xl">
                <Link href={libraryItemHref(item)} className="block min-h-[126px] overflow-hidden"><Poster title={item.title} posterUrl={item.posterUrl} /></Link>
                <div className="min-w-0 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"><span>{mediaTypeLabel(item.type)}</span><span>·</span><span>{progressLabel(item)}</span></div>
                  <Link href={libraryItemHref(item)} className="mt-1.5 line-clamp-1 block font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">{item.title}</Link>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progressPercent(item)}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-[var(--text-muted)]">{updatedTime(item.updatedAt, generatedAt)}</span>
                    <button onClick={() => void checkIn(item)} className="pb-uiverse-checkin inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent)]">
                      <Plus className="size-3" /> {item.type === "movie" ? "10 min" : item.type === "series" || item.type === "anime" ? "Episode" : item.type === "comic" ? "Issue" : "Chapter"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {signedIn && staleItems.length > 0 && (
        <section>
          <SectionHeading eyebrow="A gentle reminder" title="Want to pick one of these back up?" action="Open library" href="/library" />
          <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-3">
              {staleItems.slice(0, 8).map((item) => (
                <article key={item.id} className="pb-uiverse-media-card group relative w-[270px] shrink-0 overflow-hidden rounded-[22px] p-3 sm:w-[320px]">
                  {item.backdropUrl && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 -z-20 bg-cover bg-center opacity-[0.16] transition duration-500 group-hover:scale-[1.03] group-hover:opacity-[0.22]"
                      style={{ backgroundImage: `url(\"${item.backdropUrl}\")` }}
                    />
                  )}
                  <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,var(--bg-surface)_18%,color-mix(in_srgb,var(--bg-surface)_88%,transparent)_68%,color-mix(in_srgb,var(--bg-surface)_68%,transparent))]" />
                  <div className="flex gap-3">
                    <Link href={libraryItemHref(item)} className="h-[118px] w-[78px] shrink-0 overflow-hidden rounded-[14px] bg-[var(--bg-elevated)]">
                      <Poster title={item.title} posterUrl={item.posterUrl} />
                    </Link>
                    <div className="min-w-0 flex-1 py-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">{mediaTypeLabel(item.type)} · {Math.round(progressPercent(item))}%</div>
                      <Link href={libraryItemHref(item)} className="mt-1.5 line-clamp-2 block font-display text-base font-bold leading-5 text-[var(--text)] transition group-hover:text-[var(--accent)]">{item.title}</Link>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{updatedTime(item.updatedAt, generatedAt)} · {progressLabel(item)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                    <Link href={libraryItemHref(item)} className="pb-uiverse-button pb-uiverse-button--accent inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white">
                      <CirclePlay className="size-3.5" /> Resume
                    </Link>
                    <button
                      type="button"
                      onClick={() => void setStatus(item.id, "on_hold")}
                      className="pb-uiverse-button pb-uiverse-button--glass inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-[var(--text-secondary)]"
                    >
                      Pause for now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <ForYouRow />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura rounded-[24px] p-5 sm:p-6">
          <SectionHeading eyebrow="What fits tonight?" title="Pick something for tonight" action="Open the Box" href="/randomize" />
          <p className="-mt-2 mb-5 text-sm leading-6 text-[var(--text-secondary)]">A short list from what you already saved, prioritising things you have started and are closest to finishing.</p>
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
        </section>

        <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura rounded-[24px] p-5 sm:p-6">
          <SectionHeading eyebrow="Your list" title="Saved for later" action="View stats" href="/stats" />
          <div className="grid grid-cols-2 gap-3">
            <div className="pb-uiverse-mini-card rounded-2xl p-4"><div className="text-2xl font-bold text-[var(--text)]">{stats.planned}</div><div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">saved for later</div></div>
            <div className="pb-uiverse-mini-card rounded-2xl p-4"><div className="text-2xl font-bold text-[var(--text)]">{stale}</div><div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">quiet for 3+ weeks</div></div>
            <div className="pb-uiverse-mini-card pb-uiverse-mini-card--accent col-span-2 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]"><TrendingUp className="size-4" /> A little nudge</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{stats.planned === 0 ? "Nothing is waiting right now. Save anything you want to come back to later." : stale > 0 ? `${stale} in-progress ${stale === 1 ? "title has" : "titles have"} gone quiet. Pick one back up or move it to Paused.` : "Everything you’re following is up to date. Keep checking in whenever you finish an episode, chapter, issue or a few more minutes."}</p>
            </div>
          </div>
        </section>
      </div>

      {upcoming.length > 0 && (
        <section>
          <SectionHeading eyebrow="Coming soon" title="On your radar" action="Full calendar" href="/schedule" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(0, 4).map((item) => (
              <Link key={`${item.source}-${item.id}`} href={resultHref(item)} className="pb-uiverse-card pb-uiverse-card--compact group flex min-w-0 gap-3 rounded-2xl p-3">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg"><Poster title={item.title} posterUrl={item.posterUrl} /></div>
                <div className="min-w-0 py-1"><div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"><Clock3 className="size-3" /> {mediaTypeLabel(item.type)}</div><p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[var(--text)] group-hover:text-[var(--accent)]">{item.title}</p>{item.year && <p className="mt-1 text-xs text-[var(--text-muted)]">{item.year}</p>}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
