import type { UnifiedSearchResult } from "@core/utils/search";
import {
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
  getTrendingMovies,
  getTrendingSeries,
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
  getDisneyTv,
  getNostalgiaShows,
  getByStreamingProvider,
} from "@/lib/discovery";
import { STREAMING_PROVIDERS } from "@/lib/streaming-providers";

export interface BrowseSection {
  slug: string;
  title: string;
  subtitle?: string;
  fetch: (limit: number) => Promise<UnifiedSearchResult[]>;
}

const CORE_SECTIONS: BrowseSection[] = [
  { slug: "trending-anime", title: "Trending Anime", fetch: getTrendingAnime },
  { slug: "popular-anime", title: "Popular Anime", fetch: getPopularAnime },
  { slug: "trending-manga", title: "Trending Manga", fetch: getTrendingManga },
  { slug: "trending-movies", title: "Trending Movies", fetch: getTrendingMovies },
  { slug: "trending-series", title: "Trending Series", fetch: getTrendingSeries },
  { slug: "popular-movies", title: "Popular Movies", fetch: getPopularMovies },
  { slug: "popular-series", title: "Popular TV & Series", fetch: getPopularSeries },
  { slug: "kdrama", title: "K-Drama", subtitle: "Trending from Korea", fetch: getKdrama },
  { slug: "cartoons", title: "Animation & Cartoons", subtitle: "Western & all-ages", fetch: getWesternAnimation },
  { slug: "top-rated-movies", title: "Top Rated Movies", fetch: getTopRatedMovies },
  { slug: "disney-movies", title: "Disney", subtitle: "Animation, Pixar, Disney Channel & live action", fetch: async (limit) => { const [movies, tv] = await Promise.all([getDisneyMovies(limit), getDisneyTv(limit)]); return [...movies, ...tv]; } },
  { slug: "og-tv", title: "OG TV Shows", subtitle: "Nickelodeon, Disney XD, Kix-era action, Cartoon Network & more", fetch: getNostalgiaShows },
  {
    slug: "marvel",
    title: "Marvel",
    subtitle: "Movies & TV",
    fetch: async (limit) => {
      const [m, t] = await Promise.all([getMarvelMovies(limit), getMarvelTv(limit)]);
      return [...m, ...t];
    },
  },
  {
    slug: "dc",
    title: "DC",
    subtitle: "Movies & TV",
    fetch: async (limit) => {
      const [m, t] = await Promise.all([getDcMovies(limit), getDcTv(limit)]);
      return [...m, ...t].slice(0, limit);
    },
  },
];

const STREAMING_SECTIONS: BrowseSection[] = STREAMING_PROVIDERS.map((p) => ({
  slug: `streaming-${p.slug}`,
  title: p.name,
  subtitle: "Streaming now",
  fetch: (limit: number) => getByStreamingProvider(p.tmdbId, "movie", limit),
}));

export const BROWSE_SECTIONS: BrowseSection[] = [...CORE_SECTIONS, ...STREAMING_SECTIONS];

export function getBrowseSection(slug: string): BrowseSection | null {
  return BROWSE_SECTIONS.find((s) => s.slug === slug) ?? null;
}
