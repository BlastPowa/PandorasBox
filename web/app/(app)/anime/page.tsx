import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Flame, Search, Sparkles, Star } from "lucide-react";
import { getTrendingAnime, getPopularAnime } from "@/lib/discovery";
import {
  getSeasonalAnime,
  getRecentlyAired,
  currentSeason,
  isAnimeSeason,
  ANIME_SEASONS,
  type AnimeSeason,
} from "@/lib/anime";
import { Hero } from "@/components/discovery/hero";
import { PosterRow, PosterRowSkeleton, PosterGrid } from "@/components/discovery/poster-row";
import { AmbientBackground } from "@/components/home/ambient-background";
import { SeasonPicker } from "@/components/anime/season-picker";
import { LatestEpisodes } from "@/components/anime/latest-episodes";

export const revalidate = 1800;

interface SearchParams {
  season?: string;
  year?: string;
}

function resolveSeason(sp: SearchParams): { season: AnimeSeason; year: number } {
  const fallback = currentSeason();
  const season = sp.season && isAnimeSeason(sp.season) ? sp.season : fallback.season;
  const parsedYear = Number.parseInt(sp.year ?? "", 10);
  // Clamp to a sane window — AniList has nothing meaningful before 1960, and a
  // far-future year just returns an empty season.
  const year =
    Number.isFinite(parsedYear) && parsedYear >= 1960 && parsedYear <= fallback.year + 1
      ? parsedYear
      : fallback.year;
  return { season, year };
}

async function AnimeContent({ season, year }: { season: AnimeSeason; year: number }) {
  const [trending, popular, seasonal, latest] = await Promise.all([
    getTrendingAnime(24),
    getPopularAnime(24),
    getSeasonalAnime(season, year),
    getRecentlyAired(15),
  ]);

  const heroItems = trending.filter((i) => i.backdropUrl).slice(0, 5);
  const seasonLabel = `${ANIME_SEASONS.find((s) => s.value === season)?.label} ${year}`;
  const isCurrent =
    season === currentSeason().season && year === currentSeason().year;
  const scoredSeasonal = seasonal.filter((item) => item.score !== null);
  const seasonAverage = scoredSeasonal.length > 0
    ? scoredSeasonal.reduce((total, item) => total + (item.score ?? 0), 0) / scoredSeasonal.length
    : null;
  const topSeasonal = [...scoredSeasonal].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;

  return (
    <div className="space-y-10">
      <AmbientBackground imageUrl={heroItems[0]?.backdropUrl ?? null} />
      <Hero items={heroItems} />

      <section className="relative z-20 -mt-20 rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,13,22,0.9),rgba(20,15,31,0.82))] p-4 shadow-2xl backdrop-blur-xl sm:-mt-12 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="size-3.5 text-[var(--accent)]" /> Anime discovery
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Follow what is airing, then dig deeper
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              Jump between new episodes, the {seasonLabel} slate, current trends and all-time favourites without losing your place.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
            {[
              ["#latest-anime", "Latest"],
              ["#season-anime", "Season"],
              ["#trending-anime", "Trending"],
              ["#popular-anime", "Popular"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {label}
              </a>
            ))}
            <Link
              href="/search"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-xs font-extrabold text-black transition hover:bg-white/90"
            >
              <Search className="size-3.5" /> Search anime
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/55">
              <CalendarDays className="size-4 text-[var(--accent)]" /> {seasonLabel}
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums text-white">{seasonal.length}</p>
            <p className="text-[11px] text-white/45">titles in this season view</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/55">
              <Star className="size-4 text-[var(--gold)]" /> Season score
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums text-white">
              {seasonAverage !== null ? seasonAverage.toFixed(1) : "—"}
            </p>
            <p className="truncate text-[11px] text-white/45">
              {topSeasonal ? `Top: ${topSeasonal.title}` : "Waiting for scored titles"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/55">
              <Clock3 className="size-4 text-[var(--accent)]" /> Just aired
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums text-white">{latest.length}</p>
            <p className="text-[11px] text-white/45">recent popular episode drops</p>
          </div>
        </div>
      </section>

      <div id="latest-anime" className="scroll-mt-24"><LatestEpisodes episodes={latest} /></div>

      <section id="season-anime" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">
              <Flame className="size-3.5" /> Seasonal pulse
            </div>
            <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold">
              This Season
              <span className="rounded-full bg-[var(--glass)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                {seasonLabel}
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {isCurrent ? "Currently airing shows" : `Shows that aired in ${seasonLabel}`}
            </p>
          </div>
          <SeasonPicker season={season} year={year} />
        </div>

        {seasonal.length > 0 ? (
          <><div className="sm:hidden"><PosterRow title="Season picks" subtitle="Swipe to explore" items={seasonal} /></div><div className="hidden sm:block"><PosterGrid items={seasonal} /></div></>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            No anime found for {seasonLabel}.
          </p>
        )}
      </section>

      <div id="trending-anime" className="scroll-mt-24">
        <PosterRow title="Trending Anime" subtitle="What everyone's watching right now" items={trending} viewAllHref="/browse/trending-anime" quickLook />
      </div>
      <div id="popular-anime" className="scroll-mt-24">
        <PosterRow title="Popular Anime" subtitle="All-time favourites" items={popular} viewAllHref="/browse/popular-anime" quickLook />
      </div>
    </div>
  );
}

export default async function AnimePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { season, year } = resolveSeason(await searchParams);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <Suspense
        key={`${season}-${year}`}
        fallback={
          <div className="space-y-8">
            <div className="skeleton h-[60vh] w-full rounded-[var(--radius-xl)]" />
            <PosterRowSkeleton title="Trending Anime" />
          </div>
        }
      >
        <AnimeContent season={season} year={year} />
      </Suspense>
    </div>
  );
}
