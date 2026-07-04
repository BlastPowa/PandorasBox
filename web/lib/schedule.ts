import "server-only";
import { getPosterUrl } from "@core/api/tmdb";

const ANILIST_URL = "https://graphql.anilist.co";

export interface ScheduleEntry {
  id: string;
  kind: "anime" | "movie" | "series";
  detailType: "anime" | "movie" | "series";
  source: "anilist" | "tmdb";
  refId: string;
  title: string;
  posterUrl: string | null;
  timestamp: number; // unix seconds
  label: string; // "Ep 5", "Theatrical", "Premiere"
  hasTime: boolean; // true = precise air time; false = date-only
}

function entryHref(e: ScheduleEntry): string {
  return `/title/${e.detailType}/${e.source}/${e.refId}`;
}
export { entryHref };

/* ---------------------------------- anime --------------------------------- */

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

export async function getAnimeWeek(days = 7): Promise<ScheduleEntry[]> {
  const now = Math.floor(Date.now() / 1000);
  const end = now + 60 * 60 * 24 * days;
  const query = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          episode
          airingAt
          media { id title { english romaji } coverImage { large } isAdult popularity }
        }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { start: now, end } }),
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { airingSchedules?: AiringNode[] } } };
    return (json.data?.Page?.airingSchedules ?? [])
      .filter((n) => !n.media.isAdult && (n.media.popularity ?? 0) > 3000)
      .map((n) => ({
        id: `anilist-${n.media.id}`,
        kind: "anime" as const,
        detailType: "anime" as const,
        source: "anilist" as const,
        refId: String(n.media.id),
        title: n.media.title.english ?? n.media.title.romaji,
        posterUrl: n.media.coverImage.large,
        timestamp: n.airingAt,
        label: `Ep ${n.episode}`,
        hasTime: true,
      }));
  } catch {
    return [];
  }
}

/* -------------------------------- tmdb utils ------------------------------ */

interface TMDBRow {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

async function tmdb(pathAndQuery: string): Promise<TMDBRow[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}api_key=${key}`,
      { next: { revalidate: 60 * 60 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBRow[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}

function dateToUnix(d: string): number {
  return Math.floor(new Date(`${d}T12:00:00`).getTime() / 1000);
}

/* -------------------------------- movies ---------------------------------- */

export async function getMovieReleasesWindow(region: string, days = 21): Promise<ScheduleEntry[]> {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
  const rows = await tmdb(
    `discover/movie?region=${region}&primary_release_date.gte=${start}&primary_release_date.lte=${endDate}&sort_by=primary_release_date.asc&vote_count.gte=0&with_release_type=2|3`
  );
  return rows
    .filter((r) => r.release_date)
    .slice(0, 40)
    .map((r) => ({
      id: `tmdb-${r.id}`,
      kind: "movie" as const,
      detailType: "movie" as const,
      source: "tmdb" as const,
      refId: String(r.id),
      title: r.title ?? r.name ?? "Untitled",
      posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
      timestamp: dateToUnix(r.release_date as string),
      label: "Theatrical",
      hasTime: false,
    }));
}

/* ---------------------------------- tv ------------------------------------ */

/* ------------------------------- upcoming --------------------------------- */

interface AniListUpcomingNode {
  id: number;
  title: { english: string | null; romaji: string };
  coverImage: { large: string | null };
  startDate: { year: number | null; month: number | null; day: number | null };
  popularity: number | null;
  isAdult: boolean;
}

export async function getUpcomingAnime(): Promise<ScheduleEntry[]> {
  const query = `
    query {
      Page(page: 1, perPage: 40) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { english romaji }
          coverImage { large }
          startDate { year month day }
          popularity
          isAdult
        }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { media?: AniListUpcomingNode[] } } };
    return (json.data?.Page?.media ?? [])
      .filter((m) => !m.isAdult && m.startDate.year)
      .map((m) => {
        const y = m.startDate.year as number;
        const mo = m.startDate.month ?? 1;
        const d = m.startDate.day ?? 1;
        return {
          id: `anilist-${m.id}`,
          kind: "anime" as const,
          detailType: "anime" as const,
          source: "anilist" as const,
          refId: String(m.id),
          title: m.title.english ?? m.title.romaji,
          posterUrl: m.coverImage.large,
          timestamp: Math.floor(new Date(y, mo - 1, d, 12).getTime() / 1000),
          label: "Announced",
          hasTime: false,
        };
      });
  } catch {
    return [];
  }
}

export async function getUpcomingMovies(region: string): Promise<ScheduleEntry[]> {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
  const rows = await tmdb(
    `discover/movie?region=${region}&primary_release_date.gte=${today}&primary_release_date.lte=${end}&sort_by=popularity.desc&with_release_type=2|3`
  );
  return rows
    .filter((r) => r.release_date)
    .slice(0, 40)
    .map((r) => ({
      id: `tmdb-${r.id}`,
      kind: "movie" as const,
      detailType: "movie" as const,
      source: "tmdb" as const,
      refId: String(r.id),
      title: r.title ?? r.name ?? "Untitled",
      posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
      timestamp: dateToUnix(r.release_date as string),
      label: "Coming soon",
      hasTime: false,
    }));
}

export async function getUpcomingTv(): Promise<ScheduleEntry[]> {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
  const rows = await tmdb(
    `discover/tv?first_air_date.gte=${today}&first_air_date.lte=${end}&sort_by=popularity.desc`
  );
  return rows
    .filter((r) => r.first_air_date)
    .slice(0, 40)
    .map((r) => ({
      id: `tmdb-${r.id}`,
      kind: "series" as const,
      detailType: "series" as const,
      source: "tmdb" as const,
      refId: String(r.id),
      title: r.name ?? r.title ?? "Untitled",
      posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
      timestamp: dateToUnix(r.first_air_date as string),
      label: "Premieres",
      hasTime: false,
    }));
}

export async function getTvWindow(days = 14): Promise<ScheduleEntry[]> {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
  // shows with episodes airing in the window (new + returning)
  const rows = await tmdb(
    `discover/tv?air_date.gte=${start}&air_date.lte=${endDate}&sort_by=popularity.desc&vote_count.gte=20`
  );
  return rows.slice(0, 40).map((r) => {
    const premiere = r.first_air_date && r.first_air_date >= start && r.first_air_date <= endDate;
    return {
      id: `tmdb-${r.id}`,
      kind: "series" as const,
      detailType: "series" as const,
      source: "tmdb" as const,
      refId: String(r.id),
      title: r.name ?? r.title ?? "Untitled",
      posterUrl: r.poster_path ? getPosterUrl(r.poster_path) : null,
      timestamp: premiere ? dateToUnix(r.first_air_date as string) : dateToUnix(start),
      label: premiere ? "Premiere" : "New episodes",
      hasTime: false,
    };
  });
}
