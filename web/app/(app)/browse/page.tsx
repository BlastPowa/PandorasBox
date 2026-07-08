import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
  getPopularMovies,
  getPopularSeries,
  getKdrama,
  getWesternAnimation,
  getTopRatedMovies,
  getMarvelMovies,
  getMarvelTv,
  getDcMovies,
  getDcTv,
  getDisneyMovies,
  getNostalgiaShows,
  getByStreamingProvider,
} from "@/lib/discovery";
import { getStreamingProvider } from "@/lib/streaming-providers";
import { FRANCHISES } from "@/lib/franchises";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { ProviderSwitcher } from "@/components/discovery/provider-switcher";

export const revalidate = 3600;

const NETFLIX = getStreamingProvider("netflix")!;

async function BrowseContent() {
  const [
    movies,
    series,
    kdrama,
    cartoons,
    topMovies,
    anime,
    popAnime,
    manga,
    marvelMovies,
    marvelTv,
    dcMovies,
    dcTv,
    disneyMovies,
    nostalgia,
    netflix,
  ] = await Promise.all([
    getPopularMovies(),
    getPopularSeries(),
    getKdrama(),
    getWesternAnimation(),
    getTopRatedMovies(),
    getTrendingAnime(),
    getPopularAnime(),
    getTrendingManga(),
    getMarvelMovies(),
    getMarvelTv(),
    getDcMovies(),
    getDcTv(),
    getDisneyMovies(),
    getNostalgiaShows(),
    // Only the default provider is fetched server-side; the switcher lazily
    // loads the rest on click instead of firing 10 TMDB calls on every render.
    getByStreamingProvider(NETFLIX.tmdbId),
  ]);

  const hasTmdb = movies.length > 0 || series.length > 0;
  const marvel = [...marvelMovies, ...marvelTv];
  const dc = [...dcMovies, ...dcTv];

  return (
    <div className="space-y-8">
      {!hasTmdb && (
        <p className="rounded-[var(--radius-md)] border border-[rgba(245,165,36,0.3)] bg-[rgba(245,165,36,0.1)] px-4 py-3 text-sm text-[#fbbf24]">
          Add a free <span className="font-mono">TMDB_API_KEY</span> to unlock Movies, TV, K-drama and cartoons.
          Anime &amp; manga rows work right now.
        </p>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-lg font-bold">
          <Sparkles className="size-5 text-[var(--gold)]" /> Franchise Collections
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FRANCHISES.map((f) => (
            <Link
              key={f.slug}
              href={`/browse/franchise/${f.slug}`}
              className="glass glow-ring rounded-[var(--radius-lg)] p-4 hover:border-[var(--accent)]"
            >
              <h3 className="font-display font-bold">{f.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{f.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <PosterRow title="Popular Movies" items={movies} viewAllHref="/browse/popular-movies" />
      <PosterRow title="Popular TV & Series" items={series} viewAllHref="/browse/popular-series" />
      <PosterRow title="K-Drama" subtitle="Trending from Korea" items={kdrama} viewAllHref="/browse/kdrama" />
      <PosterRow title="Animation & Cartoons" subtitle="Western & all-ages" items={cartoons} viewAllHref="/browse/cartoons" />
      <PosterRow title="Marvel" subtitle="Movies & TV" items={marvel} viewAllHref="/browse/marvel" />
      <PosterRow title="DC" subtitle="Movies & TV" items={dc} viewAllHref="/browse/dc" />
      <PosterRow title="Disney Movies" items={disneyMovies} viewAllHref="/browse/disney-movies" />
      <PosterRow title="OG TV Shows" subtitle="2000s Nickelodeon, Disney Channel & Disney XD" items={nostalgia} viewAllHref="/browse/og-tv" />
      <PosterRow title="Trending Anime" items={anime} viewAllHref="/browse/trending-anime" />
      <PosterRow title="Popular Anime" items={popAnime} viewAllHref="/browse/popular-anime" />
      <PosterRow title="Trending Manga" items={manga} viewAllHref="/browse/trending-manga" />
      <PosterRow title="Top Rated Movies" items={topMovies} viewAllHref="/browse/top-rated-movies" />

      <ProviderSwitcher initialProvider="netflix" initialResults={netflix} />
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
