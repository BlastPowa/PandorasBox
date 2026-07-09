const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_URL = "https://api.igdb.com/v4";

/** IGDB image CDN. Sizes: t_cover_big (264x374), t_720p, t_1080p, t_screenshot_big. */
export function igdbImage(imageId: string, size = "cover_big"): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

// --- token cache (module-scoped; client-credentials tokens last ~60 days) ---
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.IGDB_CLIENT_ID;
  const secret = process.env.IGDB_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  try {
    const res = await fetch(
      `${TOKEN_URL}?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
      { method: "POST", cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return cachedToken.value;
  } catch {
    return null;
  }
}

async function igdbQuery<T>(endpoint: string, body: string, revalidate = 3600): Promise<T[]> {
  const id = process.env.IGDB_CLIENT_ID;
  const token = await getToken();
  if (!id || !token) return [];
  try {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Client-ID": id, Authorization: `Bearer ${token}`, Accept: "application/json" },
      body,
      next: { revalidate },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

export interface GameCard {
  id: number;
  name: string;
  coverUrl: string | null;
  rating: number | null;
  year: number | null;
}

interface RawCard {
  id: number;
  name: string;
  cover?: { image_id: string };
  rating?: number;
  first_release_date?: number;
}

function mapCard(g: RawCard): GameCard {
  return {
    id: g.id,
    name: g.name,
    coverUrl: g.cover ? igdbImage(g.cover.image_id, "cover_big") : null,
    rating: typeof g.rating === "number" ? Math.round(g.rating) / 10 : null,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
  };
}

// game_type=0 is a base game (not DLC/expansion/bundle) — the deprecated
// `category` field silently returns nothing, so `game_type` must be used.
const BASE_GAME = "game_type = 0";

export type GameSort = "popular" | "top_rated" | "upcoming" | "new";

export async function getGames(sort: GameSort, limit = 24): Promise<GameCard[]> {
  const now = Math.floor(Date.now() / 1000);
  let where = `${BASE_GAME} & cover != null`;
  let order = "sort rating_count desc";

  if (sort === "top_rated") {
    where += " & rating_count > 80";
    order = "sort rating desc";
  } else if (sort === "upcoming") {
    where += ` & first_release_date > ${now}`;
    order = "sort hypes desc";
  } else if (sort === "new") {
    where += ` & first_release_date < ${now} & rating_count > 5`;
    order = "sort first_release_date desc";
  } else {
    where += " & rating_count > 40";
  }

  const rows = await igdbQuery<RawCard>(
    "games",
    `fields name, cover.image_id, rating, first_release_date; where ${where}; ${order}; limit ${limit};`
  );
  return rows.map(mapCard);
}

export interface GameDlc {
  id: number;
  name: string;
  coverUrl: string | null;
  summary: string | null;
}

export interface GameVideo {
  id: number;
  name: string;
  youtubeId: string;
}

export interface GameDetail {
  id: number;
  name: string;
  summary: string | null;
  storyline: string | null;
  coverUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  year: number | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  steamUrl: string | null;
  epicUrl: string | null;
  videos: GameVideo[];
  dlcs: GameDlc[];
  screenshots: string[];
}

interface RawDetail extends RawCard {
  summary?: string;
  storyline?: string;
  genres?: { name: string }[];
  platforms?: { abbreviation?: string; name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
  videos?: { video_id: string; name?: string; id: number }[];
  websites?: { url: string }[];
  dlcs?: { id: number; name: string; cover?: { image_id: string }; summary?: string }[];
  screenshots?: { image_id: string }[];
}

export async function getGameDetail(id: number): Promise<GameDetail | null> {
  const rows = await igdbQuery<RawDetail>(
    "games",
    `fields name, summary, storyline, cover.image_id, rating, first_release_date,
      genres.name, platforms.abbreviation, platforms.name,
      involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
      videos.video_id, videos.name,
      websites.url,
      dlcs.name, dlcs.cover.image_id, dlcs.summary,
      screenshots.image_id;
     where id = ${id};`
  );
  const g = rows[0];
  if (!g) return null;

  const companies = g.involved_companies ?? [];
  const sites = g.websites ?? [];
  const shots = g.screenshots ?? [];

  return {
    id: g.id,
    name: g.name,
    summary: g.summary ?? null,
    storyline: g.storyline ?? null,
    coverUrl: g.cover ? igdbImage(g.cover.image_id, "cover_big") : null,
    // No true 16:9 art from IGDB; the first screenshot stands in for the hero.
    backdropUrl: shots[0] ? igdbImage(shots[0].image_id, "1080p") : null,
    rating: typeof g.rating === "number" ? Math.round(g.rating) / 10 : null,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    genres: (g.genres ?? []).map((x) => x.name),
    platforms: (g.platforms ?? []).map((p) => p.abbreviation ?? p.name),
    developers: companies.filter((c) => c.developer).map((c) => c.company.name),
    publishers: companies.filter((c) => c.publisher).map((c) => c.company.name),
    // `category` on websites is deprecated (returns null), so match by host.
    steamUrl: sites.find((w) => w.url.includes("store.steampowered.com"))?.url ?? null,
    epicUrl: sites.find((w) => w.url.includes("epicgames.com"))?.url ?? null,
    videos: (g.videos ?? []).map((v) => ({ id: v.id, name: v.name ?? "Trailer", youtubeId: v.video_id })),
    dlcs: (g.dlcs ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      coverUrl: d.cover ? igdbImage(d.cover.image_id, "cover_big") : null,
      summary: d.summary ?? null,
    })),
    screenshots: shots.map((s) => igdbImage(s.image_id, "screenshot_big")),
  };
}
