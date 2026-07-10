import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
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
  const spotlight = movies.find((item) => item.backdropUrl) ?? series.find((item) => item.backdropUrl) ?? anime.find((item) => item.backdropUrl);

  return (
    <div className="space-y-8">
      <section className="relative -mx-4 -mt-6 min-h-[320px] overflow-hidden border-b border-[var(--border)] md:-mx-8 md:min-h-[390px]">
        {spotlight?.backdropUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(spotlight.backdropUrl)})` }} />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--cinematic-scrim)_0%,rgb(7_7_12/0.72)_42%,transparent_78%),linear-gradient(to_top,var(--bg-base),transparent_65%)]" />
        <div className="relative flex min-h-[320px] max-w-2xl flex-col justify-end px-4 pb-12 pt-20 md:min-h-[390px] md:px-10 md:pb-16">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--media-border)] bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur"><Compass className="size-3.5 text-[var(--accent)]" /> Explore PBox</span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">Find your next world</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">Movies, series, anime, manga, comics, and games—curated across every corner of your entertainment library.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/movies" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-6 text-sm font-bold text-[#0a0a0f]">Browse movies <ArrowRight className="size-4" /></Link><Link href="/anime" className="glass inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">Explore anime</Link></div>
        </div>
      </section>
      {!hasTmdb && (
        <p className="rounded-[var(--radius-md)] border border-[rgb(var(--gold-rgb)/0.3)] bg-[rgb(var(--gold-rgb)/0.1)] px-4 py-3 text-sm text-[var(--gold)]">
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
