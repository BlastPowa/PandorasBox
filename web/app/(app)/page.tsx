import { Suspense } from "react";
import {
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
  getTrendingMovies,
  getTrendingSeries,
} from "@/lib/discovery";
import { getUpcomingAnime, getUpcomingMovies, type ScheduleEntry } from "@/lib/schedule";
import type { UnifiedSearchResult } from "@core/utils/search";
import { Hero } from "@/components/discovery/hero";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { MyPanel } from "@/components/home/my-panel";
import { FriendsActivity } from "@/components/home/friends-activity";

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
    getUpcomingMovies("US"),
  ]);

  const heroPool = [...movies.slice(0, 2), ...anime.slice(0, 3), ...series.slice(0, 1)];
  const comingSoon = [...upMovies.slice(0, 10), ...upAnime.slice(0, 10)]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(scheduleToResult);

  return (
    <div className="space-y-8">
      <MyPanel />
      <FriendsActivity />
      <Hero items={heroPool.length > 0 ? heroPool : anime} />
      <PosterRow title="Trending Anime" subtitle="What everyone's watching right now" items={anime} />
      {comingSoon.length > 0 && (
        <PosterRow title="Coming Soon" subtitle="Announced & upcoming releases" items={comingSoon} />
      )}
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
