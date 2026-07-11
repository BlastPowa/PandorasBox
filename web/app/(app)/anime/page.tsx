import { Suspense } from "react";
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

  return (
    <div className="space-y-10">
      <AmbientBackground imageUrl={heroItems[0]?.backdropUrl ?? null} />
      <Hero items={heroItems} />

      <div className="relative z-10 -mt-20 rounded-t-[28px] bg-[linear-gradient(to_bottom,rgb(7_7_12/0.96),var(--bg-base))] px-1 pt-5 sm:mt-0 sm:rounded-none sm:bg-none sm:p-0"><LatestEpisodes episodes={latest} /></div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
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

      <PosterRow title="Trending Anime" subtitle="What everyone's watching right now" items={trending} viewAllHref="/browse/trending-anime" />
      <PosterRow title="Popular Anime" subtitle="All-time favourites" items={popular} viewAllHref="/browse/popular-anime" />
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
