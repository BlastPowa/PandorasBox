/**
 * Modular integration provider registry.
 * Add a new provider by appending to PROVIDERS — the OAuth routes, sync engine
 * and Settings UI all iterate this list.
 */
import type { ReelItemStatus } from "@core/storage/schema";

export type ProviderId = "mal" | "anilist";

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
  syncTypes: readonly ("anime" | "manga" | "manhwa")[];
}

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
};

export function getProvider(id: string): ProviderConfig | null {
  return id === "mal" || id === "anilist" ? PROVIDERS[id] : null;
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
  REPEATING: "watching",
};

export function remoteStatusToReel(
  provider: ProviderId,
  status: string,
  kind: "anime" | "manga"
): ReelItemStatus {
  if (provider === "anilist") {
    const s = ANILIST_TO_REEL[status] ?? "planned";
    return s === "watching" && kind === "manga" ? "reading" : s;
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
      case "completed": return "COMPLETED";
      case "on_hold": return "PAUSED";
      case "dropped": return "DROPPED";
      default: return "PLANNING";
    }
  }
  switch (status) {
    case "watching":
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
