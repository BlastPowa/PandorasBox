import { Suspense } from "react";
import {
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
  getTrendingMovies,
  getTrendingSeries,
} from "@/lib/discovery";
import { Hero } from "@/components/discovery/hero";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { MyPanel } from "@/components/home/my-panel";

export const revalidate = 1800;

async function HomeContent() {
  const [anime, popular, manga, movies, series] = await Promise.all([
    getTrendingAnime(),
    getPopularAnime(),
    getTrendingManga(),
    getTrendingMovies(),
    getTrendingSeries(),
  ]);

  const heroPool = [...movies.slice(0, 2), ...anime.slice(0, 3), ...series.slice(0, 1)];

  return (
    <div className="space-y-8">
      <MyPanel />
      <Hero items={heroPool.length > 0 ? heroPool : anime} />
      <PosterRow title="Trending Anime" subtitle="What everyone's watching right now" items={anime} />
      {movies.length > 0 && <PosterRow title="Trending Movies" items={movies} />}
      {series.length > 0 && <PosterRow title="Trending Series" items={series} />}
      <PosterRow title="Popular Anime" subtitle="All-time favourites" items={popular} />
      <PosterRow title="Trending Manga" items={manga} />
      {movies.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Add a free <span className="text-[var(--accent)]">TMDB_API_KEY</span> in{" "}
          <code className="font-mono text-xs">web/.env.local</code> to unlock movie &amp; series rows.
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="skeleton h-[340px] w-full rounded-[var(--radius-xl)]" />
            <PosterRowSkeleton title="Trending Anime" />
            <PosterRowSkeleton title="Trending Movies" />
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
