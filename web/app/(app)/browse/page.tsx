import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Dices, Flame, Sparkles, Star, WandSparkles } from "lucide-react";
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
} from "@/lib/discovery";

import { FRANCHISES } from "@/lib/franchises";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { ProviderFeed } from "@/components/home/provider-feed";
import { CinematicSpotlight } from "@/components/home/cinematic-spotlight";
import { CinematicRail } from "@/components/home/cinematic-rail";
import { FranchiseExplorer } from "@/components/discovery/franchise-explorer";


export const revalidate = 3600;


const DISCOVERY_PATHS = [
  { label: "Movie night", description: "Recent well-rated thrillers", href: "/randomize?type=movie&genres=Thriller&era=2020s&quality=7", icon: Flame },
  { label: "Anime gem", description: "Top-tier fantasy picks", href: "/randomize?type=anime&genres=Fantasy&quality=8", icon: Sparkles },
  { label: "Comfort watch", description: "2000s comedy series", href: "/randomize?type=series&genres=Comedy&era=2000s&quality=7", icon: Star },
  { label: "Surprise me", description: "Open the whole box", href: "/randomize", icon: Dices },
] as const;

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

  ]);

  const hasTmdb = movies.length > 0 || series.length > 0;
  const marvel = [...marvelMovies, ...marvelTv];
  const dc = [...dcMovies, ...dcTv];

  return (
    <div className="pb-cinema-home pb-discover-page">
      <CinematicSpotlight items={[...movies.slice(0, 2), ...series.slice(0, 2), ...anime.slice(0, 2)]} />
      <div className="pb-cinema-body">
      <section aria-label="Explore categories">
        <div className="pb-cinema-section-heading"><div><p className="pb-cinema-eyebrow">Every kind of story</p><h2>Find your next world</h2></div><Link href="/search" className="pb-cinema-browse">Search everything <ArrowRight className="size-3.5" /></Link></div>
        <div className="pb-discover-categories">{[
          { label: "Movies", href: "/movies", artwork: movies[0]?.backdropUrl },
          { label: "TV Shows", href: "/tv", artwork: series[0]?.backdropUrl },
          { label: "Anime", href: "/anime", artwork: anime[0]?.backdropUrl },
          { label: "Manga", href: "/browse/trending-manga", artwork: manga[0]?.posterUrl },
          { label: "Comics", href: "/comics", artwork: marvel[0]?.backdropUrl },
          { label: "Games", href: "/gamers", artwork: null },
        ].map((category) => <Link key={category.href} href={category.href} className="pb-discover-category" style={category.artwork ? { backgroundImage: `url(${JSON.stringify(category.artwork)})` } : undefined}><span>{category.label}</span><ArrowRight className="size-4" /></Link>)}</div>
      </section>
      {!hasTmdb && (
        <p className="rounded-[var(--radius-md)] border border-[rgb(var(--gold-rgb)/0.3)] bg-[rgb(var(--gold-rgb)/0.1)] px-4 py-3 text-sm text-[var(--gold)]">
          Movie and TV discovery is temporarily unavailable. Anime and manga are still ready to explore.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]"><WandSparkles className="size-3.5" /> Discovery paths</div>
            <h2 className="font-display text-xl font-bold">Start with a vibe</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Jump into a tuned Randomizer preset, then reshape it however you want.</p>
          </div>
          <Link href="/randomize" className="hidden text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] sm:inline-flex">All randomizer controls</Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {DISCOVERY_PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <Link key={path.label} href={path.href} className="pb-discover-mood glass group flex min-h-28 items-end justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.45)]">
                <div><span className="font-display text-base font-bold text-[var(--text)]">{path.label}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{path.description}</span></div>
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] transition group-hover:bg-[rgb(var(--accent-rgb)/0.2)]"><Icon className="size-4.5" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="pb-discover-franchises"><FranchiseExplorer franchises={FRANCHISES} /></div>

      <CinematicRail title="Popular Movies" items={movies} href="/browse/popular-movies" />
      <CinematicRail title="Popular TV & Series" items={series} href="/browse/popular-series" />
      <ProviderFeed />
      <CinematicRail title="K-Drama" eyebrow="Trending from Korea" items={kdrama} href="/browse/kdrama" />
      <CinematicRail title="Animation & Cartoons" eyebrow="Western & all-ages" items={cartoons} href="/browse/cartoons" />
      <CinematicRail title="Marvel" eyebrow="Movies & TV" items={marvel} href="/browse/marvel" />
      <CinematicRail title="DC" eyebrow="Movies & TV" items={dc} href="/browse/dc" />
      <CinematicRail title="Disney Movies" items={disneyMovies} href="/browse/disney-movies" />
      <CinematicRail title="OG TV Shows" eyebrow="Nickelodeon, Disney XD, Kix-era action, Cartoon Network & more" items={nostalgia} href="/browse/og-tv" />
      <CinematicRail title="Trending Anime" items={anime} href="/browse/trending-anime" />
      <CinematicRail title="Popular Anime" items={popAnime} href="/browse/popular-anime" />
      <PosterRow title="Trending Manga" items={manga} viewAllHref="/browse/trending-manga" />
      <CinematicRail title="Top Rated Movies" items={topMovies} href="/browse/top-rated-movies" ranked />

      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <div className="w-full">
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
