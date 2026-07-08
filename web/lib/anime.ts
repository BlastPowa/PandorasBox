import type { UnifiedSearchResult } from "@core/utils/search";
import { formatAniListDescription } from "@core/api/anilist";

const ANILIST_URL = "https://graphql.anilist.co";

export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export const ANIME_SEASONS: { value: AnimeSeason; label: string }[] = [
  { value: "WINTER", label: "Winter" },
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "FALL", label: "Fall" },
];

/** AniList seasons map to calendar quarters. */
export function currentSeason(date = new Date()): { season: AnimeSeason; year: number } {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  if (month <= 1) return { season: "WINTER", year };
  if (month <= 4) return { season: "SPRING", year };
  if (month <= 7) return { season: "SUMMER", year };
  if (month <= 10) return { season: "FALL", year };
  return { season: "WINTER", year: year + 1 };
}

/** Years offered in the season picker — anime archives get thin before ~1960. */
export function seasonYears(count = 30): number[] {
  const thisYear = currentSeason().year;
  return Array.from({ length: count }, (_, i) => thisYear - i);
}

export function isAnimeSeason(v: string): v is AnimeSeason {
  return ANIME_SEASONS.some((s) => s.value === v);
}

interface AniListCard {
  id: number;
  title: { romaji: string; english: string | null };
  description: string | null;
  coverImage: { large: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  seasonYear: number | null;
  episodes: number | null;
  format: string;
}

const CARD_FIELDS = `
  id
  title { romaji english }
  description(asHtml: false)
  coverImage { large }
  bannerImage
  averageScore
  seasonYear
  episodes
  format
`;

function mapCard(m: AniListCard): UnifiedSearchResult {
  return {
    id: `anilist-${m.id}`,
    source: "anilist",
    type: "anime",
    title: m.title.english ?? m.title.romaji,
    posterUrl: m.coverImage.large,
    backdropUrl: m.bannerImage,
    year: m.seasonYear,
    synopsis: m.description ? formatAniListDescription(m.description) : null,
    score: m.averageScore !== null ? m.averageScore / 10 : null,
    totalEpisodes: m.episodes,
    totalChapters: null,
    anilistId: m.id,
    tmdbId: null,
    mangadexId: null,
    malId: null,
  };
}

async function anilist<T>(query: string, variables: Record<string, unknown>, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** Shows airing in a given season/year — the "Summer 2026" browse axis. */
export async function getSeasonalAnime(
  season: AnimeSeason,
  year: number,
  limit = 24
): Promise<UnifiedSearchResult[]> {
  const query = `
    query ($season: MediaSeason, $year: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${CARD_FIELDS}
        }
      }
    }
  `;
  const data = await anilist<{ Page?: { media?: AniListCard[] } }>(
    query,
    { season, year, perPage: Math.min(limit, 50) },
    60 * 60
  );
  return (data?.Page?.media ?? []).map(mapCard);
}

export interface AiredEpisode {
  id: string;
  anilistId: number;
  title: string;
  posterUrl: string | null;
  episode: number;
  airedAt: number;
}

interface AiringNode {
  episode: number;
  airingAt: number;
  media: {
    id: number;
    title: { english: string | null; romaji: string };
    coverImage: { large: string | null };
    isAdult: boolean;
    popularity: number | null;
  };
}

/** Episodes that have already aired, newest first (the "Latest Episodes" grid). */
export async function getRecentlyAired(limit = 15): Promise<AiredEpisode[]> {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 60 * 60 * 24 * 7;
  const query = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME_DESC) {
          episode
          airingAt
          media { id title { english romaji } coverImage { large } isAdult popularity }
        }
      }
    }
  `;
  const data = await anilist<{ Page?: { airingSchedules?: AiringNode[] } }>(
    query,
    { start, end: now },
    60 * 15
  );
  const seen = new Set<number>();
  return (data?.Page?.airingSchedules ?? [])
    .filter((n) => !n.media.isAdult && (n.media.popularity ?? 0) > 2000)
    .filter((n) => {
      // One card per show — otherwise a weekly simulcast floods the grid.
      if (seen.has(n.media.id)) return false;
      seen.add(n.media.id);
      return true;
    })
    .slice(0, limit)
    .map((n) => ({
      id: `anilist-${n.media.id}-${n.episode}`,
      anilistId: n.media.id,
      title: n.media.title.english ?? n.media.title.romaji,
      posterUrl: n.media.coverImage.large,
      episode: n.episode,
      airedAt: n.airingAt,
    }));
}
