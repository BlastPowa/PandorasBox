/**
 * Modular integration provider registry.
 * Add a new provider by appending to PROVIDERS — the OAuth routes, sync engine
 * and Settings UI all iterate this list.
 */
import type { ReelItemStatus } from "@core/storage/schema";

export type ProviderId = "mal" | "anilist" | "trakt" | "simkl";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  color: string;               // brand accent for the card badge
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  scopes: string;
  /** MAL uses PKCE with the "plain" method; AniList uses a standard code grant. */
  pkce: "plain" | "none";
  /** Which library item types this provider can sync. */
  syncTypes: readonly ("movie" | "series" | "anime" | "manga" | "manhwa")[];
}

export const ACTIVE_PROVIDER_IDS: readonly ProviderId[] = ["mal", "anilist"];

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  mal: {
    id: "mal",
    name: "MyAnimeList",
    description: "Two-way sync your anime & manga lists with MyAnimeList",
    color: "#2e51a2",
    authorizeUrl: "https://myanimelist.net/v1/oauth2/authorize",
    tokenUrl: "https://myanimelist.net/v1/oauth2/token",
    clientId: process.env.MAL_CLIENT_ID,
    clientSecret: process.env.MAL_CLIENT_SECRET,
    scopes: "write:users",
    pkce: "plain",
    syncTypes: ["anime", "manga", "manhwa"],
  },
  anilist: {
    id: "anilist",
    name: "AniList",
    description: "Two-way sync your anime & manga lists with AniList",
    color: "#3db4f2",
    authorizeUrl: "https://anilist.co/api/v2/oauth/authorize",
    tokenUrl: "https://anilist.co/api/v2/oauth/token",
    clientId: process.env.ANILIST_CLIENT_ID,
    clientSecret: process.env.ANILIST_CLIENT_SECRET,
    scopes: "",
    pkce: "none",
    syncTypes: ["anime", "manga", "manhwa"],
  },
  trakt: {
    id: "trakt",
    name: "Trakt",
    description: "Two-way sync your movie and TV watch history with Trakt",
    color: "#ed1c24",
    authorizeUrl: "https://trakt.tv/oauth/authorize",
    tokenUrl: "https://auth.trakt.tv/oauth/token",
    clientId: process.env.TRAKT_CLIENT_ID,
    clientSecret: process.env.TRAKT_CLIENT_SECRET,
    scopes: "",
    pkce: "none",
    syncTypes: ["movie", "series"],
  },
  simkl: {
    id: "simkl",
    name: "Simkl",
    description: "Two-way sync movies and TV shows with your Simkl watchlists, history and ratings",
    color: "#0e5dab",
    authorizeUrl: "https://simkl.com/oauth/authorize",
    tokenUrl: "https://api.simkl.com/oauth/token",
    clientId: process.env.SIMKL_CLIENT_ID,
    clientSecret: process.env.SIMKL_CLIENT_SECRET,
    scopes: "",
    pkce: "none",
    syncTypes: ["movie", "series"],
  },
};

export function getProvider(id: string): ProviderConfig | null {
  return id === "mal" || id === "anilist" || id === "trakt" || id === "simkl" ? PROVIDERS[id] : null;
}

export function providerIsActive(id: string): id is ProviderId {
  return ACTIVE_PROVIDER_IDS.includes(id as ProviderId);
}

export function providerIsConfigured(cfg: ProviderConfig): boolean {
  if (!cfg.clientId) return false;
  if (cfg.id === "trakt" || cfg.id === "simkl") return Boolean(cfg.clientSecret);
  return true;
}

export const SIMKL_APP_NAME = "pandoras-box";
export const SIMKL_APP_VERSION = "1.0";

export function simklApiUrl(path: string): string {
  const url = new URL(`https://api.simkl.com${path}`);
  const clientId = PROVIDERS.simkl.clientId;
  if (clientId) url.searchParams.set("client_id", clientId);
  url.searchParams.set("app-name", SIMKL_APP_NAME);
  url.searchParams.set("app-version", SIMKL_APP_VERSION);
  return url.toString();
}

export function simklHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": `PandorasBox/${SIMKL_APP_VERSION}`,
    "Content-Type": "application/json",
  };
  const clientId = PROVIDERS.simkl.clientId;
  if (clientId) headers["simkl-api-key"] = clientId;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function redirectUri(origin: string, provider: ProviderId): string {
  return `${origin}/api/integrations/${provider}/callback`;
}

/* ---------------------------- status mapping ---------------------------- */

const MAL_ANIME_TO_REEL: Record<string, ReelItemStatus> = {
  watching: "watching",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
  plan_to_watch: "planned",
};
const MAL_MANGA_TO_REEL: Record<string, ReelItemStatus> = {
  reading: "reading",
  completed: "completed",
  on_hold: "on_hold",
  dropped: "dropped",
  plan_to_read: "planned",
};
const ANILIST_TO_REEL: Record<string, ReelItemStatus> = {
  CURRENT: "watching",
  COMPLETED: "completed",
  PAUSED: "on_hold",
  DROPPED: "dropped",
  PLANNING: "planned",
  REPEATING: "rewatching",
};

export function remoteStatusToReel(
  provider: ProviderId,
  status: string,
  kind: "anime" | "manga"
): ReelItemStatus {
  if (provider === "anilist") {
    const s = ANILIST_TO_REEL[status] ?? "planned";
    return (s === "watching" || s === "rewatching") && kind === "manga" ? "reading" : s;
  }
  return (kind === "anime" ? MAL_ANIME_TO_REEL : MAL_MANGA_TO_REEL)[status] ?? "planned";
}

export function reelStatusToRemote(
  provider: ProviderId,
  status: ReelItemStatus,
  kind: "anime" | "manga"
): string {
  if (provider === "anilist") {
    switch (status) {
      case "watching":
      case "reading": return "CURRENT";
      case "rewatching": return "REPEATING";
      case "completed": return "COMPLETED";
      case "on_hold": return "PAUSED";
      case "dropped": return "DROPPED";
      default: return "PLANNING";
    }
  }
  switch (status) {
    case "watching":
    case "rewatching":
    case "reading": return kind === "anime" ? "watching" : "reading";
    case "completed": return "completed";
    case "on_hold": return "on_hold";
    case "dropped": return "dropped";
    default: return kind === "anime" ? "plan_to_watch" : "plan_to_read";
  }
}

/** Reel ratings are 1–5 stars; MAL/AniList use a 10-point scale. */
export const reelRatingToRemote = (r: number | null) => (r == null ? null : Math.round(r * 2));
export const remoteRatingToReel = (r: number | null | undefined) =>
  r == null || r === 0 ? null : Math.max(1, Math.min(5, Math.round(r / 2)));
