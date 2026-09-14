import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
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
import { FranchiseExplorer } from "@/components/discovery/franchise-explorer";
import { AmbientBackground } from "@/components/home/ambient-background";

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
    getNostalgiaShows(60),
    // Only the default provider is fetched server-side; the switcher lazily
    // loads the rest on click instead of firing 10 TMDB calls on every render.
    getByStreamingProvider(NETFLIX.tmdbId),
  ]);

  const hasTmdb = movies.length > 0 || series.length > 0;
  const marvel = [...marvelMovies, ...marvelTv];
  const dc = [...dcMovies, ...dcTv];
  const spotlight = movies.find((item) => item.backdropUrl) ?? series.find((item) => item.backdropUrl) ?? anime.find((item) => item.backdropUrl);
  const backdropSlides = Array.from(new Set([...movies, ...series, ...anime, ...topMovies].map((item) => item.backdropUrl).filter((url): url is string => Boolean(url)))).slice(0, 6);

  return (
    <div className="space-y-8">
      <AmbientBackground imageUrl={backdropSlides[0] ?? spotlight?.backdropUrl ?? null} imageUrls={backdropSlides} intervalMs={7000} />
      <section className="relative -mx-4 -mt-6 min-h-[320px] overflow-hidden border-b border-[var(--border)] bg-[var(--bg-surface)] md:-mx-8 md:min-h-[390px]">
        {spotlight?.backdropUrl && <div className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-55 md:w-[72%]" style={{ backgroundImage: `url(${JSON.stringify(spotlight.backdropUrl)})` }} />}
        <div className="absolute inset-0 bg-[var(--cinematic-scrim)] opacity-75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--bg-surface)_0%,transparent_88%),linear-gradient(to_top,var(--bg-surface)_0%,transparent_62%)] opacity-90" />
        <div className="relative flex min-h-[320px] max-w-2xl flex-col justify-end px-4 pb-12 pt-20 md:min-h-[390px] md:px-10 md:pb-16">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgb(var(--accent-rgb)/0.30)] bg-[rgb(var(--accent-rgb)/0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] backdrop-blur-md"><Compass className="size-3.5" /> Explore PBox</span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-[var(--text)] sm:text-6xl">Find your next world</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">Movies, series, anime, manga, comics, and games—curated across every corner of your entertainment library.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/movies" className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)]">Browse movies <ArrowRight className="size-4" /></Link><Link href="/anime" className="inline-flex h-11 items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] px-6 text-sm font-semibold text-[var(--text)] shadow-sm backdrop-blur-md transition hover:border-[var(--border-strong)]">Explore anime</Link></div>
        </div>
      </section>
      {!hasTmdb && (
        <p className="rounded-[var(--radius-md)] border border-[rgb(var(--gold-rgb)/0.3)] bg-[rgb(var(--gold-rgb)/0.1)] px-4 py-3 text-sm text-[var(--gold)]">
          Add a free <span className="font-mono">TMDB_API_KEY</span> to unlock Movies, TV, K-drama and cartoons.
          Anime &amp; manga rows work right now.
        </p>
      )}

      <FranchiseExplorer franchises={FRANCHISES} />

      <PosterRow title="Popular Movies" items={movies} viewAllHref="/browse/popular-movies" />
      <PosterRow title="Popular TV & Series" items={series} viewAllHref="/browse/popular-series" />
      <ProviderSwitcher initialProvider="netflix" initialResults={netflix} />
      <PosterRow title="K-Drama" subtitle="Trending from Korea" items={kdrama} viewAllHref="/browse/kdrama" />
      <PosterRow title="Animation & Cartoons" subtitle="Western & all-ages" items={cartoons} viewAllHref="/browse/cartoons" />
      <PosterRow title="Marvel" subtitle="Movies & TV" items={marvel} viewAllHref="/browse/marvel" />
      <PosterRow title="DC" subtitle="Movies & TV" items={dc} viewAllHref="/browse/dc" />
      <PosterRow title="Disney Movies" items={disneyMovies} viewAllHref="/browse/disney-movies" />
      <PosterRow title="OG TV Shows" subtitle="Nickelodeon, Disney XD, Kix-era action, Cartoon Network & more" items={nostalgia} viewAllHref="/browse/og-tv" randomize />
      <PosterRow title="Trending Anime" items={anime} viewAllHref="/browse/trending-anime" />
      <PosterRow title="Popular Anime" items={popAnime} viewAllHref="/browse/popular-anime" />
      <PosterRow title="Trending Manga" items={manga} viewAllHref="/browse/trending-manga" />
      <PosterRow title="Top Rated Movies" items={topMovies} viewAllHref="/browse/top-rated-movies" />

    </div>
  );
}

export default function BrowsePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
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
