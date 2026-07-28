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
  backdropUrl: string | null;
  summary: string | null;
  rating: number | null;
  year: number | null;
  platforms: string[];
  peakPlayers: number | null;
}

interface RawCard {
  id: number;
  name: string;
  cover?: { image_id: string };
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  summary?: string;
  rating?: number;
  first_release_date?: number;
  platforms?: { name: string }[];
}

function mapCard(g: RawCard, peakPlayers: number | null = null): GameCard {
  const backdrop = g.artworks?.[0] ?? g.screenshots?.[0];
  return {
    id: g.id,
    name: g.name,
    coverUrl: g.cover ? igdbImage(g.cover.image_id, "cover_big") : null,
    backdropUrl: backdrop ? igdbImage(backdrop.image_id, "1080p") : null,
    summary: g.summary ?? null,
    rating: typeof g.rating === "number" ? Math.round(g.rating) / 10 : null,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    platforms: (g.platforms ?? []).map((platform) => platform.name),
    peakPlayers,
  };
}

// game_type=0 is a base game (not DLC/expansion/bundle) — the deprecated
// `category` field silently returns nothing, so `game_type` must be used.
const BASE_GAME = "game_type = 0";

export type GameSort = "popular" | "most_played" | "top_rated" | "upcoming" | "new";

export interface GameFilters {
  platform?: number | null;
  genre?: number | null;
  yearFrom?: number | null;
  ratingMin?: number | null;
}

const CARD_FIELDS = "name, cover.image_id, artworks.image_id, screenshots.image_id, summary, rating, first_release_date, platforms.name";

async function getSteamPlayerCounts(gameIds: number[]): Promise<Map<number, number>> {
  if (gameIds.length === 0) return new Map();
  const links = await igdbQuery<{ game: number; uid: string }>(
    "external_games",
    `fields game,uid; where external_game_source = 1 & game = (${gameIds.join(",")}); limit 100;`,
    900,
  );
  const byGame = new Map<number, number>();
  const queue = links.filter((link) => /^\d+$/.test(String(link.uid)));

  // Steam's public current-player endpoint is intentionally called in small
  // batches and cached for five minutes so one page render cannot create a
  // burst of dozens of simultaneous requests.
  for (let index = 0; index < queue.length; index += 4) {
    const batch = queue.slice(index, index + 4);
    const counts = await Promise.all(batch.map(async (link) => {
      try {
        const response = await fetch(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${encodeURIComponent(link.uid)}`,
          { next: { revalidate: 300 } },
        );
        if (!response.ok) return null;
        const json = await response.json() as { response?: { player_count?: number; result?: number } };
        return json.response?.result === 1 && typeof json.response.player_count === "number"
          ? [Number(link.game), json.response.player_count] as const
          : null;
      } catch {
        return null;
      }
    }));
    counts.forEach((entry) => {
      if (entry) byGame.set(entry[0], entry[1]);
    });
  }
  return byGame;
}

export async function getGames(sort: GameSort, limit = 24, filters: GameFilters = {}): Promise<GameCard[]> {
  if (sort === "most_played") {
    const primitives = await igdbQuery<{ game_id: number; value: number }>(
      "popularity_primitives",
      `fields game_id,value; where popularity_type = 5; sort value desc; limit ${Math.min(Math.max(limit * 2, 24), 100)};`,
      900,
    );
    const ids = primitives.map((item) => Number(item.game_id)).filter(Number.isFinite).slice(0, Math.min(limit * 2, 100));
    if (ids.length === 0) return [];
    const constraints = [`id = (${ids.join(",")})`, BASE_GAME, "cover != null"];
    if (filters.platform) constraints.push(`platforms = ${filters.platform}`);
    if (filters.genre) constraints.push(`genres = ${filters.genre}`);
    if (filters.yearFrom) constraints.push(`first_release_date >= ${Math.floor(Date.UTC(filters.yearFrom, 0, 1) / 1000)}`);
    if (filters.ratingMin) constraints.push(`rating >= ${filters.ratingMin * 10}`);
    const rows = await igdbQuery<RawCard>(
      "games",
      `fields ${CARD_FIELDS}; where ${constraints.join(" & ")}; limit ${Math.min(limit * 2, 100)};`,
      900,
    );
    const playerCounts = await getSteamPlayerCounts(rows.map((game) => game.id));
    return rows
      .map((game) => mapCard(game, playerCounts.get(game.id) ?? null))
      .sort((a, b) => (b.peakPlayers ?? 0) - (a.peakPlayers ?? 0))
      .slice(0, limit);
  }

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
  if (filters.platform) where += ` & platforms = ${filters.platform}`;
  if (filters.genre) where += ` & genres = ${filters.genre}`;
  if (filters.yearFrom) where += ` & first_release_date >= ${Math.floor(Date.UTC(filters.yearFrom, 0, 1) / 1000)}`;
  if (filters.ratingMin) where += ` & rating >= ${filters.ratingMin * 10}`;

  const rows = await igdbQuery<RawCard>(
    "games",
    `fields ${CARD_FIELDS}; where ${where}; ${order}; limit ${limit};`
  );
  return rows.map((game) => mapCard(game));
}

export async function searchGames(query: string, limit = 24): Promise<GameCard[]> {
  const normalized = query.trim().slice(0, 100).replace(/[\\"]/g, " ");
  if (normalized.length < 2) return [];

  const rows = await igdbQuery<RawCard>(
    "games",
    `search "${normalized}"; fields ${CARD_FIELDS}; where ${BASE_GAME}; limit ${limit};`,
    300
  );
  return rows.map((game) => mapCard(game));
}

export interface GameDlc {
  id: number;
  name: string;
  coverUrl: string | null;
  artworkUrl: string | null;
  summary: string | null;
  year: number | null;
  platforms: string[];
  kind: "DLC" | "Expansion" | "Standalone expansion";
}

export interface GameEdition {
  id: number;
  name: string;
  versionTitle: string | null;
  coverUrl: string | null;
  summary: string | null;
  features: { title: string; description: string | null }[];
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
  editions: GameEdition[];
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
  dlcs?: RawDlc[];
  expansions?: RawDlc[];
  standalone_expansions?: RawDlc[];
  screenshots?: { image_id: string }[];
}

interface RawDlc { id: number; name: string; cover?: { image_id: string }; artworks?: { image_id: string }[]; summary?: string; first_release_date?: number; platforms?: { abbreviation?: string; name: string }[]; }
interface RawGameVersion { games?: { id: number; name: string; version_title?: string; cover?: { image_id: string }; summary?: string }[]; features?: { title: string; description?: string; values?: { game: number; included_feature: number; note?: string }[] }[]; }

export async function getGameDetail(id: number): Promise<GameDetail | null> {
  const [rows, versionRows] = await Promise.all([igdbQuery<RawDetail>("games",
    `fields name, summary, storyline, cover.image_id, rating, first_release_date,
      genres.name, platforms.abbreviation, platforms.name,
      involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
      videos.video_id, videos.name,
      websites.url,
      dlcs.name, dlcs.cover.image_id, dlcs.artworks.image_id, dlcs.summary, dlcs.first_release_date, dlcs.platforms.abbreviation, dlcs.platforms.name,
      expansions.name, expansions.cover.image_id, expansions.artworks.image_id, expansions.summary, expansions.first_release_date, expansions.platforms.abbreviation, expansions.platforms.name,
      standalone_expansions.name, standalone_expansions.cover.image_id, standalone_expansions.artworks.image_id, standalone_expansions.summary, standalone_expansions.first_release_date, standalone_expansions.platforms.abbreviation, standalone_expansions.platforms.name,
      screenshots.image_id;
     where id = ${id};`
  ), igdbQuery<RawGameVersion>("game_versions", `fields games.id, games.name, games.version_title, games.cover.image_id, games.summary, features.title, features.description, features.values.game, features.values.included_feature, features.values.note; where game = ${id};`)]);
  const g = rows[0];
  if (!g) return null;

  const companies = g.involved_companies ?? [];
  const sites = g.websites ?? [];
  const shots = g.screenshots ?? [];
  const seenDlc = new Set<number>();
  const mapDlc = (entries: RawDlc[], kind: GameDlc["kind"]) => entries.filter((entry) => !seenDlc.has(entry.id) && seenDlc.add(entry.id)).map((entry) => ({ id: entry.id, name: entry.name, coverUrl: entry.cover ? igdbImage(entry.cover.image_id, "720p") : null, artworkUrl: entry.artworks?.[0] ? igdbImage(entry.artworks[0].image_id, "1080p") : null, summary: entry.summary ?? null, year: entry.first_release_date ? new Date(entry.first_release_date * 1000).getUTCFullYear() : null, platforms: (entry.platforms ?? []).map((platform) => platform.abbreviation ?? platform.name), kind }));
  const featuresForEdition = (editionId: number) => versionRows.flatMap((row) => row.features ?? []).flatMap((feature) => (feature.values ?? []).filter((value) => value.game === editionId && value.included_feature !== 0).map((value) => ({ title: feature.title, description: value.note ?? feature.description ?? null })));

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
    dlcs: [...mapDlc(g.dlcs ?? [], "DLC"), ...mapDlc(g.expansions ?? [], "Expansion"), ...mapDlc(g.standalone_expansions ?? [], "Standalone expansion")],
    editions: versionRows.flatMap((row) => row.games ?? []).filter((edition) => edition.id !== g.id).map((edition) => ({ id: edition.id, name: edition.name, versionTitle: edition.version_title ?? null, coverUrl: edition.cover ? igdbImage(edition.cover.image_id, "cover_big") : null, summary: edition.summary ?? null, features: featuresForEdition(edition.id) })),
    screenshots: shots.map((s) => igdbImage(s.image_id, "1080p")),
  };
}
