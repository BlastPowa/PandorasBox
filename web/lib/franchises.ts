import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";

export interface FranchiseDef {
  slug: string;
  name: string;
  description: string;
}

export const FRANCHISES: FranchiseDef[] = [
  { slug: "star-wars", name: "Star Wars", description: "All films, in release order." },
  { slug: "harry-potter", name: "Harry Potter", description: "The Wizarding World, in release order." },
  { slug: "lord-of-the-rings", name: "The Lord of the Rings", description: "Middle-earth, in release order." },
  { slug: "mcu", name: "Marvel Cinematic Universe", description: "Every MCU film, in release order." },
];

export function getFranchise(slug: string): FranchiseDef | null {
  return FRANCHISES.find((f) => f.slug === slug) ?? null;
}

interface TMDBCollectionPart {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
  vote_average: number;
  adult?: boolean;
}

async function fetchCollection(collectionId: number): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/collection/${collectionId}?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { parts?: TMDBCollectionPart[] };
    return toResults(json.parts ?? []);
  } catch {
    return [];
  }
}

async function fetchByCompanyChronological(companyId: number, limit = 40): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_companies=${companyId}&include_adult=false&sort_by=release_date.asc&vote_count.gte=5&page=1`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBCollectionPart[] };
    return toResults((json.results ?? []).slice(0, limit));
  } catch {
    return [];
  }
}

function toResults(parts: TMDBCollectionPart[]): UnifiedSearchResult[] {
  return parts
    .filter((p) => !p.adult)
    .sort((a, b) => new Date(a.release_date ?? "9999").getTime() - new Date(b.release_date ?? "9999").getTime())
    .map((p) => ({
      id: `tmdb-${p.id}`,
      source: "tmdb" as const,
      type: "movie" as const,
      title: p.title,
      posterUrl: p.poster_path ? getPosterUrl(p.poster_path) : null,
      year: p.release_date ? Number.parseInt(p.release_date.slice(0, 4), 10) || null : null,
      synopsis: p.overview || null,
      score: p.vote_average > 0 ? p.vote_average : null,
      totalEpisodes: null,
      totalChapters: null,
      anilistId: null,
      tmdbId: p.id,
      mangadexId: null,
      malId: null,
    }));
}

// TMDB collection ids: Star Wars = 10, Harry Potter = 1241, LOTR = 119.
// MCU has no single TMDB collection, so it's built from Marvel Studios (company 420),
// chronological = release order.
export async function getFranchiseItems(slug: string): Promise<UnifiedSearchResult[]> {
  switch (slug) {
    case "star-wars":
      return fetchCollection(10);
    case "harry-potter":
      return fetchCollection(1241);
    case "lord-of-the-rings":
      return fetchCollection(119);
    case "mcu":
      return fetchByCompanyChronological(420);
    default:
      return [];
  }
}
