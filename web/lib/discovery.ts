import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl, getBackdropUrl } from "@core/api/tmdb";
import { formatAniListDescription } from "@core/api/anilist";

const ANILIST_URL = "https://graphql.anilist.co";

interface AniListCard {
  id: number;
  title: { romaji: string; english: string | null };
  description: string | null;
  coverImage: { large: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  seasonYear: number | null;
  episodes: number | null;
  chapters: number | null;
  format: string;
}

const ANILIST_CARD_FIELDS = `
  id
  title { romaji english }
  description(asHtml: false)
  coverImage { large }
  bannerImage
  averageScore
  seasonYear
  episodes
  chapters
  format
`;

function mapAniList(media: AniListCard, forcedType?: "anime" | "manga"): UnifiedSearchResult {
  const isManga =
    forcedType === "manga" ||
    (!forcedType && (media.format === "MANGA" || media.format === "NOVEL" || media.format === "ONE_SHOT"));
  return {
    id: `anilist-${media.id}`,
    source: "anilist",
    type: isManga ? "manga" : "anime",
    title: media.title.english ?? media.title.romaji,
    posterUrl: media.coverImage.large,
    year: media.seasonYear,
    synopsis: media.description ? formatAniListDescription(media.description) : null,
    score: media.averageScore !== null ? media.averageScore / 10 : null,
    totalEpisodes: media.episodes,
    totalChapters: media.chapters,
    anilistId: media.id,
    tmdbId: null,
    mangadexId: null,
    malId: null,
  };
}

async function aniListPage(
  sort: string,
  type: "ANIME" | "MANGA",
  perPage = 18
): Promise<UnifiedSearchResult[]> {
  const query = `
    query ($sort: [MediaSort], $type: MediaType, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(sort: $sort, type: $type, isAdult: false) { ${ANILIST_CARD_FIELDS} }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { sort: [sort], type, perPage } }),
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { media?: AniListCard[] } } };
    const media = json.data?.Page?.media ?? [];
    return media.map((m) => mapAniList(m, type === "MANGA" ? "manga" : "anime"));
  } catch {
    return [];
  }
}

export function getTrendingAnime(): Promise<UnifiedSearchResult[]> {
  return aniListPage("TRENDING_DESC", "ANIME");
}
export function getPopularAnime(): Promise<UnifiedSearchResult[]> {
  return aniListPage("POPULARITY_DESC", "ANIME");
}
export function getTrendingManga(): Promise<UnifiedSearchResult[]> {
  return aniListPage("TRENDING_DESC", "MANGA");
}

interface TMDBTrending {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  adult?: boolean;
}

async function tmdbTrending(kind: "movie" | "tv"): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/${kind}/week?api_key=${key}`,
      { next: { revalidate: 60 * 60 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBTrending[] };
    return (json.results ?? []).filter((r) => !r.adult).slice(0, 18).map((r) => {
      const date = r.release_date ?? r.first_air_date ?? "";
      return {
        id: `tmdb-${r.id}`,
        source: "tmdb" as const,
        type: kind === "movie" ? ("movie" as const) : ("series" as const),
        title: r.title ?? r.name ?? "Untitled",
        posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
        year: date ? Number.parseInt(date.slice(0, 4), 10) || null : null,
        synopsis: r.overview || null,
        score: r.vote_average > 0 ? r.vote_average : null,
        totalEpisodes: null,
        totalChapters: null,
        anilistId: null,
        tmdbId: r.id,
        mangadexId: null,
        malId: null,
      };
    });
  } catch {
    return [];
  }
}

export function getTrendingMovies(): Promise<UnifiedSearchResult[]> {
  return tmdbTrending("movie");
}
export function getTrendingSeries(): Promise<UnifiedSearchResult[]> {
  return tmdbTrending("tv");
}

async function tmdbDiscover(
  kind: "movie" | "tv",
  query: string
): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${query}${query.includes("?") ? "&" : "?"}api_key=${key}&include_adult=false`,
      { next: { revalidate: 60 * 60 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBTrending[] };
    return (json.results ?? []).filter((r) => !r.adult).slice(0, 18).map((r) => {
      const date = r.release_date ?? r.first_air_date ?? "";
      return {
        id: `tmdb-${r.id}`,
        source: "tmdb" as const,
        type: kind === "movie" ? ("movie" as const) : ("series" as const),
        title: r.title ?? r.name ?? "Untitled",
        posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
        year: date ? Number.parseInt(date.slice(0, 4), 10) || null : null,
        synopsis: r.overview || null,
        score: r.vote_average > 0 ? r.vote_average : null,
        totalEpisodes: null,
        totalChapters: null,
        anilistId: null,
        tmdbId: r.id,
        mangadexId: null,
        malId: null,
      };
    });
  } catch {
    return [];
  }
}

export const getPopularMovies = () => tmdbDiscover("movie", "movie/popular");
export const getPopularSeries = () => tmdbDiscover("tv", "tv/popular");
export const getKdrama = () =>
  tmdbDiscover("tv", "discover/tv?with_origin_country=KR&sort_by=popularity.desc");
export const getWesternAnimation = () =>
  tmdbDiscover("tv", "discover/tv?with_genres=16&without_origin_country=JP&sort_by=popularity.desc");
export const getTopRatedMovies = () => tmdbDiscover("movie", "movie/top_rated");

// Highlight rows — curated by TMDB production company / network so they stay
// accurate without needing an admin to hand-tag every title.
export const getMarvelMovies = () =>
  tmdbDiscover("movie", "discover/movie?with_companies=420&sort_by=popularity.desc");
export const getMarvelTv = () =>
  tmdbDiscover("tv", "discover/tv?with_companies=420&sort_by=popularity.desc");
export const getDcMovies = () =>
  tmdbDiscover("movie", "discover/movie?with_companies=9993|128064&sort_by=popularity.desc");
export const getDcTv = () =>
  tmdbDiscover("tv", "discover/tv?with_companies=9993|128064&sort_by=popularity.desc");
export const getDisneyMovies = () =>
  tmdbDiscover("movie", "discover/movie?with_companies=2&sort_by=popularity.desc");
// "OG" 2000s-era nostalgia: Nickelodeon, Disney Channel and Disney XD shows that
// first aired on or before 2015, ranked by popularity.
export const getNostalgiaShows = () =>
  tmdbDiscover(
    "tv",
    "discover/tv?with_networks=13|54|44&first_air_date.lte=2015-01-01&sort_by=popularity.desc"
  );

export function tmdbBackdrop(path: string | null): string | null {
  return path ? getBackdropUrl(path) : null;
}
