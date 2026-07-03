import { Suspense } from "react";
import {
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
  getPopularMovies,
  getPopularSeries,
  getKdrama,
  getWesternAnimation,
  getTopRatedMovies,
} from "@/lib/discovery";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";

export const revalidate = 3600;

async function BrowseContent() {
  const [movies, series, kdrama, cartoons, topMovies, anime, popAnime, manga] = await Promise.all([
    getPopularMovies(),
    getPopularSeries(),
    getKdrama(),
    getWesternAnimation(),
    getTopRatedMovies(),
    getTrendingAnime(),
    getPopularAnime(),
    getTrendingManga(),
  ]);

  const hasTmdb = movies.length > 0 || series.length > 0;

  return (
    <div className="space-y-8">
      {!hasTmdb && (
        <p className="rounded-[var(--radius-md)] border border-[rgba(245,165,36,0.3)] bg-[rgba(245,165,36,0.1)] px-4 py-3 text-sm text-[#fbbf24]">
          Add a free <span className="font-mono">TMDB_API_KEY</span> to unlock Movies, TV, K-drama and cartoons.
          Anime &amp; manga rows work right now.
        </p>
      )}
      <PosterRow title="Popular Movies" items={movies} />
      <PosterRow title="Popular TV & Series" items={series} />
      <PosterRow title="K-Drama" subtitle="Trending from Korea" items={kdrama} />
      <PosterRow title="Animation & Cartoons" subtitle="Western & all-ages" items={cartoons} />
      <PosterRow title="Trending Anime" items={anime} />
      <PosterRow title="Popular Anime" items={popAnime} />
      <PosterRow title="Trending Manga" items={manga} />
      <PosterRow title="Top Rated Movies" items={topMovies} />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <h1 className="mb-5 font-display text-2xl font-bold">Browse everything</h1>
      <Suspense
        fallback={
          <div className="space-y-8">
            <PosterRowSkeleton title="Popular Movies" />
            <PosterRowSkeleton title="Popular TV & Series" />
            <PosterRowSkeleton title="Trending Anime" />
          </div>
        }
      >
        <BrowseContent />
      </Suspense>
    </div>
  );
}
