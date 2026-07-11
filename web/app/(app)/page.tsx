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
import { AnnouncementsBar } from "@/components/home/announcements-bar";
import { AmbientBackground } from "@/components/home/ambient-background";
import { LandscapeMediaRail } from "@/components/discovery/landscape-media-rail";
import { getGames } from "@/lib/igdb";
import { GameRow } from "@/components/games/game-row";

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
  const [anime, popular, manga, movies, series, games, upAnime, upMovies] = await Promise.all([
    getTrendingAnime(),
    getPopularAnime(),
    getTrendingManga(),
    getTrendingMovies(),
    getTrendingSeries(),
    getGames("popular", 18),
    getUpcomingAnime(),
    getUpcomingMovies("US"),
  ]);

  // The hero is the page's full-bleed background, so only titles with wide
  // 16:9 artwork qualify. TMDB movies/series lead (near-universal backdrops);
  // anime fills in when it has a banner.
  const heroPool = [
    ...movies.slice(0, 3),
    ...series.slice(0, 1),
    ...anime.slice(0, 3),
  ].filter((i) => i.backdropUrl);
  const comingSoon = [...upMovies.slice(0, 10), ...upAnime.slice(0, 10)]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(scheduleToResult);

  const heroItems = heroPool.length > 0 ? heroPool : anime.filter((i) => i.backdropUrl);
  const spotlightShelf = [...movies.slice(0, 4), ...series.slice(0, 3), ...anime.filter((item) => item.backdropUrl).slice(0, 3)];

  return (
    <div className="space-y-8">
      <AmbientBackground imageUrl={heroItems[0]?.backdropUrl ?? null} />
      <AnnouncementsBar />
      <Hero items={heroItems} />
      <div className="relative z-10 -mt-28 sm:-mt-36">
        <LandscapeMediaRail title="Trending on PBox" items={spotlightShelf} />
      </div>
      <PosterRow
        title="Trending Anime"
        subtitle="What everyone's watching right now"
        items={anime}
        viewAllHref="/browse/trending-anime"
      />
      <MyPanel />
      <FriendsActivity />
      {comingSoon.length > 0 && (
        <PosterRow title="Coming Soon" subtitle="Announced & upcoming releases" items={comingSoon} />
      )}
      {movies.length > 0 && <PosterRow title="Trending Movies" items={movies} viewAllHref="/browse/trending-movies" />}
      <GameRow games={games} />
      {series.length > 0 && <PosterRow title="Trending Series" items={series} viewAllHref="/browse/trending-series" />}
      <PosterRow title="Popular Anime" subtitle="All-time favourites" items={popular} viewAllHref="/browse/popular-anime" />
      <PosterRow title="Trending Manga" items={manga} viewAllHref="/browse/trending-manga" />
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
            <PosterRowSkeleton title="Trending Games" />
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
