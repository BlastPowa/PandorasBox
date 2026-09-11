import "server-only";
import type { PlaybackSource } from "./types";

export type MediaServerProvider = "jellyfin" | "emby";

type MediaServerConfig = {
  provider: MediaServerProvider;
  providerName: string;
  baseUrl: URL;
  apiKey: string;
  userId: string | null;
};

type MediaServerItem = {
  Id?: string;
  Name?: string;
  Type?: string;
  ProductionYear?: number;
  SeriesName?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
};

type MediaServerItemsResponse = {
  Items?: MediaServerItem[];
};

export type MediaServerMatchContext = {
  title: string;
  titleAliases?: string[];
  type: string;
  year?: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
};

const PROVIDERS: Record<MediaServerProvider, { name: string; envPrefix: string }> = {
  jellyfin: { name: "Jellyfin", envPrefix: "PBOX_JELLYFIN" },
  emby: { name: "Emby", envPrefix: "PBOX_EMBY" },
};

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function envValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function configuredBaseUrl(value: string): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:";
    if (url.protocol !== "https:" && !allowHttp) return null;
    url.search = "";
    url.hash = "";
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch {
    return null;
  }
}

export function isMediaServerProvider(value: string): value is MediaServerProvider {
  return value === "jellyfin" || value === "emby";
}

export function getMediaServerConfig(provider: MediaServerProvider): MediaServerConfig | null {
  const definition = PROVIDERS[provider];
  const baseUrl = configuredBaseUrl(envValue(`${definition.envPrefix}_URL`));
  const apiKey = envValue(`${definition.envPrefix}_API_KEY`);
  if (!baseUrl || !apiKey) return null;
  const userId = envValue(`${definition.envPrefix}_USER_ID`) || null;
  return { provider, providerName: definition.name, baseUrl, apiKey, userId };
}

export function getMediaServerConfigurationStatus(): Record<MediaServerProvider, boolean> {
  return {
    jellyfin: Boolean(getMediaServerConfig("jellyfin")),
    emby: Boolean(getMediaServerConfig("emby")),
  };
}

export function mediaServerHeaders(config: MediaServerConfig): HeadersInit {
  return {
    "Accept": "application/json",
    "User-Agent": "PandorasBox/1.0 (personal media playback)",
    "X-Emby-Token": config.apiKey,
  };
}

function apiUrl(config: MediaServerConfig, path: string): URL {
  return new URL(path.replace(/^\/+/, ""), config.baseUrl);
}

function itemMatches(context: MediaServerMatchContext, item: MediaServerItem): boolean {
  const itemName = item.Name?.trim() ?? "";
  if (!item.Id || !itemName) return false;
  const wantedTitles = [context.title, ...(context.titleAliases ?? [])].map(normalise).filter(Boolean);

  if (context.type.toLowerCase() === "movie") {
    if (item.Type && item.Type !== "Movie") return false;
    if (!wantedTitles.includes(normalise(itemName))) return false;
    if (context.year && item.ProductionYear && item.ProductionYear !== context.year) return false;
    return true;
  }

  if (!context.episode) return false;
  if (item.Type && item.Type !== "Episode") return false;
  if (!wantedTitles.includes(normalise(item.SeriesName ?? ""))) return false;
  if (Number(item.ParentIndexNumber) !== (context.season ?? 1)) return false;
  if (Number(item.IndexNumber) !== context.episode) return false;
  return true;
}

async function searchMediaServer(
  config: MediaServerConfig,
  context: MediaServerMatchContext,
  searchTerm: string,
): Promise<MediaServerItem[]> {
  const path = config.userId
    ? `Users/${encodeURIComponent(config.userId)}/Items`
    : "Items";
  const url = apiUrl(config, path);
  url.searchParams.set("SearchTerm", searchTerm);
  url.searchParams.set("Recursive", "true");
  url.searchParams.set("IncludeItemTypes", context.type.toLowerCase() === "movie" ? "Movie" : "Episode");
  url.searchParams.set("Limit", "24");
  url.searchParams.set("EnableTotalRecordCount", "false");

  const response = await fetch(url, {
    headers: mediaServerHeaders(config),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];
  const payload = await response.json() as MediaServerItemsResponse;
  return Array.isArray(payload.Items) ? payload.Items : [];
}

async function discoverMediaServer(
  provider: MediaServerProvider,
  context: MediaServerMatchContext,
): Promise<PlaybackSource[]> {
  const config = getMediaServerConfig(provider);
  if (!config) return [];

  const titles = [context.title, ...(context.titleAliases ?? [])];
  const terms = context.episode
    ? [context.episodeTitle, ...titles].filter((value): value is string => Boolean(value?.trim()))
    : titles;
  const uniqueTerms = [...new Set(terms.map((value) => value.trim()))];
  const searches = await Promise.allSettled(uniqueTerms.map((term) => searchMediaServer(config, context, term)));
  const seen = new Set<string>();
  const matches = searches
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((item) => itemMatches(context, item))
    .filter((item) => {
      if (!item.Id || seen.has(item.Id)) return false;
      seen.add(item.Id);
      return true;
    })
    .slice(0, 4);

  return matches.map((item): PlaybackSource => {
    const itemId = item.Id!;
    const title = context.episode
      ? `${item.SeriesName ?? context.title} · S${context.season ?? 1}E${context.episode} · ${item.Name}`
      : item.Name!;
    return {
      id: `${provider}-${itemId}`,
      provider,
      providerName: config.providerName,
      title,
      kind: "direct",
      url: `/api/playback/media/${provider}/${encodeURIComponent(itemId)}`,
      mimeType: "video/mp4",
      quality: "Auto",
      license: `Your ${config.providerName} library`,
      sourcePageUrl: config.baseUrl.toString(),
      captions: [],
    };
  });
}

export async function discoverMediaServers(context: MediaServerMatchContext): Promise<PlaybackSource[]> {
  const results = await Promise.allSettled([
    discoverMediaServer("jellyfin", context),
    discoverMediaServer("emby", context),
  ]);
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

export function buildMediaServerStreamUrl(config: MediaServerConfig, itemId: string): URL {
  const url = apiUrl(config, `Videos/${encodeURIComponent(itemId)}/stream.mp4`);
  url.searchParams.set("Static", "false");
  url.searchParams.set("VideoCodec", "h264");
  url.searchParams.set("AudioCodec", "aac");
  url.searchParams.set("EnableAutoStreamCopy", "true");
  url.searchParams.set("MaxWidth", "1920");
  url.searchParams.set("MaxHeight", "1080");
  return url;
}
