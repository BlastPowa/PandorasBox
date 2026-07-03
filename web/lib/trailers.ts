import "server-only";
import type { ReelItemType } from "@core/storage/schema";

interface TMDBVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

function pickBest(videos: TMDBVideo[]): string | null {
  const yt = videos.filter((v) => v.site === "YouTube");
  if (yt.length === 0) return null;
  const rank = (v: TMDBVideo) => {
    let score = 0;
    if (v.type === "Trailer") score += 4;
    else if (v.type === "Teaser") score += 2;
    if (v.official) score += 1;
    return score;
  };
  return yt.slice().sort((a, b) => rank(b) - rank(a))[0]?.key ?? null;
}

async function tmdbTrailer(kind: "movie" | "tv", id: number, season?: number): Promise<string | null> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return null;
  const path =
    kind === "tv" && season !== undefined
      ? `tv/${id}/season/${season}/videos`
      : `${kind}/${id}/videos`;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${path}?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: TMDBVideo[] };
    return pickBest(json.results ?? []);
  } catch {
    return null;
  }
}

async function anilistTrailer(id: number): Promise<string | null> {
  const query = `query ($id: Int) { Media(id: $id) { trailer { id site } } }`;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { id } }),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { trailer?: { id: string; site: string } | null } };
    };
    const t = json.data?.Media?.trailer;
    return t && t.site === "youtube" ? t.id : null;
  } catch {
    return null;
  }
}

/** Returns a YouTube video key (not full URL) for the given title, or null. */
export async function getTrailerKey(
  type: ReelItemType,
  source: string,
  id: string,
  season?: number
): Promise<string | null> {
  if (type === "movie" && source === "tmdb") return tmdbTrailer("movie", Number.parseInt(id, 10));
  if (type === "series" && source === "tmdb")
    return tmdbTrailer("tv", Number.parseInt(id, 10), season);
  if (type === "anime" && source === "anilist") return anilistTrailer(Number.parseInt(id, 10));
  return null;
}
