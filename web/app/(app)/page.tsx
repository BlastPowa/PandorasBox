import { Suspense } from "react";
import {
  getPopularAnime,
  getTrendingAnime,
  getTrendingManga,
  getTrendingMovies,
  getTrendingSeries,
} from "@/lib/discovery";
import { getUpcomingAnime, getUpcomingMovies, type ScheduleEntry } from "@/lib/schedule";
import type { UnifiedSearchResult } from "@core/utils/search";
import { HomeDashboard } from "@/components/home/home-dashboard";

export const revalidate = 1800;

function scheduleToResult(e: ScheduleEntry): UnifiedSearchResult {
  const numId = Number.parseInt(e.refId, 10);
  return {
    id: e.id,
    source: e.source,
    type: e.detailType,
    title: e.title,
    posterUrl: e.posterUrl,
    year: new Date(e.timestamp * 1000).getFullYear(),
    synopsis: null,
    score: null,
    totalEpisodes: null,
    totalChapters: null,
    anilistId: e.source === "anilist" ? numId : null,
    tmdbId: e.source === "tmdb" ? numId : null,
    mangadexId: null,
    malId: null,
  };
}

async function HomeContent() {
  const [anime, popular, manga, movies, series, upAnime, upMovies] = await Promise.all([
    getTrendingAnime(),
    getPopularAnime(),
    getTrendingManga(),
    getTrendingMovies(),
    getTrendingSeries(),
    getUpcomingAnime(),
    getUpcomingMovies("IE"),
  ]);

  const upcoming = [...upMovies.slice(0, 8), ...upAnime.slice(0, 8)]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(scheduleToResult);

  const trending = [
    ...movies.slice(0, 3),
    ...series.slice(0, 2),
    ...anime.slice(0, 3),
    ...manga.slice(0, 2),
    ...popular.slice(0, 2),
  ];

  return <HomeDashboard trending={trending} upcoming={upcoming} generatedAt={getGeneratedAt()} />;
}

function getGeneratedAt(): number {
  return Date.now();
}

function HomeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="skeleton h-[360px] w-full rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-72 rounded-[24px]" />
        <div className="skeleton h-72 rounded-[24px]" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
