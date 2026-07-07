import "server-only";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";
import { createServiceClient } from "@/lib/supabase/admin";

function serviceClientOrNull(): ReturnType<typeof createServiceClient> | null {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export interface PersonCredit extends UnifiedSearchResult {
  /** Character played (acting) or job (crew). */
  role: string;
  /** Grouping bucket for the filmography sections. */
  department: string;
  releaseDate: string | null;
  popularity: number;
}

export interface PersonDetail {
  id: number;
  source: "tmdb";
  name: string;
  photoUrl: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  alsoKnownAs: string[];
  homepage: string | null;
  imdbId: string | null;
  credits: PersonCredit[];
}

interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string | null;
  also_known_as?: string[];
  homepage: string | null;
  imdb_id: string | null;
}

interface TMDBCombinedCredit {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
  popularity: number;
  adult?: boolean;
  character?: string;
  job?: string;
  department?: string;
}

interface TMDBCombinedCredits {
  cast?: TMDBCombinedCredit[];
  crew?: TMDBCombinedCredit[];
}

function mapCredit(c: TMDBCombinedCredit, isCrew: boolean): PersonCredit {
  const date = c.release_date ?? c.first_air_date ?? null;
  return {
    id: `tmdb-${c.id}`,
    source: "tmdb",
    type: c.media_type === "movie" ? "movie" : "series",
    title: c.title ?? c.name ?? "Untitled",
    posterUrl: c.poster_path ? getPosterUrl(c.poster_path) : null,
    year: date ? Number.parseInt(date.slice(0, 4), 10) || null : null,
    synopsis: c.overview || null,
    score: c.vote_average > 0 ? c.vote_average : null,
    totalEpisodes: null,
    totalChapters: null,
    anilistId: null,
    tmdbId: c.id,
    mangadexId: null,
    malId: null,
    role: isCrew ? c.job ?? "" : c.character ?? "",
    department: isCrew ? c.department ?? "Crew" : "Acting",
    releaseDate: date,
    popularity: c.popularity ?? 0,
  };
}

async function fetchFromTmdb(id: number): Promise<PersonDetail | null> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/person/${id}?api_key=${key}&append_to_response=combined_credits`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return null;
    const p = (await res.json()) as TMDBPerson & { combined_credits?: TMDBCombinedCredits };

    const cast = (p.combined_credits?.cast ?? []).filter((c) => !c.adult).map((c) => mapCredit(c, false));
    const crew = (p.combined_credits?.crew ?? []).filter((c) => !c.adult).map((c) => mapCredit(c, true));

    // Dedupe credits sharing the same title+role (TMDB lists per-episode crew rows).
    const seen = new Set<string>();
    const credits = [...cast, ...crew]
      .filter((c) => {
        const k = `${c.id}-${c.department}-${c.role}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => b.popularity - a.popularity);

    return {
      id: p.id,
      source: "tmdb",
      name: p.name,
      photoUrl: p.profile_path ? `https://image.tmdb.org/t/p/h632${p.profile_path}` : null,
      biography: p.biography || null,
      birthday: p.birthday,
      deathday: p.deathday,
      placeOfBirth: p.place_of_birth,
      knownForDepartment: p.known_for_department,
      alsoKnownAs: p.also_known_as ?? [],
      homepage: p.homepage,
      imdbId: p.imdb_id,
      credits,
    };
  } catch {
    return null;
  }
}

/** Person page data, cached in Supabase `person_cache` for 7 days to stay fast for prolific people. */
export async function getPerson(source: string, id: string): Promise<PersonDetail | null> {
  if (source !== "tmdb") return null;
  const numId = Number.parseInt(id, 10);
  if (!Number.isFinite(numId)) return null;
  const personKey = `tmdb-${numId}`;

  const supabase = serviceClientOrNull();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("person_cache")
        .select("data, updated_at")
        .eq("person_key", personKey)
        .maybeSingle();
      if (data) {
        const ageMs = Date.now() - new Date((data as { updated_at: string }).updated_at).getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) {
          return (data as { data: PersonDetail }).data;
        }
      }
    } catch {
      // fall through to live fetch
    }
  }

  const fresh = await fetchFromTmdb(numId);
  if (fresh && supabase) {
    try {
      await supabase
        .from("person_cache")
        .upsert({ person_key: personKey, data: fresh, updated_at: new Date().toISOString() });
    } catch {
      // caching is best-effort
    }
  }
  return fresh;
}
