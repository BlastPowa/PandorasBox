import { Suspense } from "react";
import {
  getTrendingAnime,
  getTrendingManga,
  getTrendingMovies,
  getTrendingSeries,
} from "@/lib/discovery";
import { HomeDashboard } from "@/components/home/home-dashboard";

export const revalidate = 1800;

async function HomeContent() {
  const [anime, manga, movies, series] = await Promise.all([
    getTrendingAnime(),
    getTrendingManga(),
    getTrendingMovies(),
    getTrendingSeries(),
  ]);

  const trending = [
    ...movies.slice(0, 3),
    ...series.slice(0, 2),
    ...anime.slice(0, 3),
    ...manga.slice(0, 2),
  ];

  return (
    <HomeDashboard
      trending={trending}
      generatedAt={getGeneratedAt()}
    />
  );
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
