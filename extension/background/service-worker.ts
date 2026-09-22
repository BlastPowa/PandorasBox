import { initManagers } from "../lib/chromeStorage";
import { getSettings, saveSettings, ensureDefaultSettings, getOrCreateSyncUserId } from "../lib/settings";
import type { ReelMessage, ReelResponseError, AiringTodayEntry } from "../lib/messages";
import { EpisodeChecker } from "../../core/notifications/episodeChecker";
import { ChapterChecker } from "../../core/notifications/chapterChecker";
import { SupabaseSync } from "../../core/sync/supabase";
import { getAiringSchedule } from "../../core/api/anilist";
import {
  getBackdropUrl,
  getMovieDetails,
  getMovieWatchProviders,
  getPosterUrl,
  getSeriesDetails,
  getSeriesWatchProviders,
} from "../../core/api/tmdb";
import { getLatestChapter } from "../../core/api/mangadex";
import { getAllWatchOptions } from "../../core/api/watchProviders";
import { unifiedSearch } from "../../core/utils/search";
import { normaliseTitle } from "../../core/utils/formatters";
import { createDefaultProgress, type ReelItem } from "../../core/storage/schema";
import type { ProgressEvent } from "../../core/storage/progressManager";

const { listManager, progressManager, cacheManager } = initManagers();

interface CinejoyPlaybackRoute {
  mediaType: "movie" | "tv";
  tmdbId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

function parseCinejoyPlayback(url: string | undefined): CinejoyPlaybackRoute | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!(parsed.hostname === "cinejoy.to" || parsed.hostname.endsWith(".cinejoy.to") || parsed.hostname === "cinejoy.pk" || parsed.hostname.endsWith(".cinejoy.pk"))) return null;
    const match = parsed.pathname.match(/\/watch\/(movie|tv)\/(\d+)(?:\/(\d+)\/(\d+))?/i);
    if (!match) return null;
    const tmdbId = Number.parseInt(match[2] ?? "", 10);
    if (!Number.isFinite(tmdbId)) return null;
    return {
      mediaType: match[1]?.toLowerCase() === "movie" ? "movie" : "tv",
      tmdbId,
      seasonNumber: match[3] ? Number.parseInt(match[3], 10) : null,
      episodeNumber: match[4] ? Number.parseInt(match[4], 10) : null,
    };
  } catch {
    return null;
  }
}

function cleanPlaybackTitle(value: string): string {
  return value
    .replace(/^watch\s+/i, "")
    .replace(/\s*[-|–—]\s*(?:cinejoy|anime nexus|watch online|stream online).*$/i, "")
    .trim();
}

function playbackSearchTitle(value: string): string {
  return cleanPlaybackTitle(value)
    .replace(/\bS\d{1,2}\s*[:.-]?\s*E\d{1,3}\b.*$/i, "")
    .replace(/\bSeason\s+\d+\s*(?:(?:Episode|Ep\.?)\s*\d+)?\b.*$/i, "")
    .replace(/\bEpisode\s+\d+\b.*$/i, "")
    .replace(/\s+(?:watch|stream)\s+(?:online|free).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferPlaybackMediaType(event: ProgressEvent): "movie" | "tv" | null {
  if (event.mediaType) return event.mediaType;
  if (event.episodeNumber !== null) return "tv";
  const value = `${event.url} ${event.title}`;
  if (/(?:^|[/?#&_-])(movie|film)(?:[/?#&=_-]|$)/i.test(value)) return "movie";
  if (/(?:^|[/?#&_-])(tv|series|show|episode|anime)(?:[/?#&=_-]|$)/i.test(value)) return "tv";
  return null;
}

function parsePlaybackNumber(value: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    const parsed = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function enrichProgressEventFromTab(event: ProgressEvent, sender?: chrome.runtime.MessageSender): void {
  const tabUrl = sender?.tab?.url;
  if (!tabUrl || tabUrl === event.url) return;

  event.url = tabUrl;
  try {
    event.site = new URL(tabUrl).hostname.replace(/^www\./, "");
  } catch {
    // Keep the frame-provided site if the tab URL cannot be parsed.
  }

  const tabTitle = cleanPlaybackTitle(sender?.tab?.title ?? "");
  if (tabTitle.length >= 2) event.title = tabTitle;

  const combined = `${tabUrl} ${tabTitle}`;
  event.episodeNumber ??= parsePlaybackNumber(combined, [
    /episode[/-](\d+)/i,
    /Episode\s+(\d+)/i,
    /\bS\d{1,2}\s*[:.-]?\s*E(\d{1,3})\b/i,
    /[?&](?:ep|episode)=(\d+)/i,
  ]);
  event.seasonNumber ??= parsePlaybackNumber(combined, [
    /season[/-](\d+)/i,
    /Season\s+(\d+)/i,
    /\bS(\d{1,2})\s*[:.-]?\s*E\d{1,3}\b/i,
    /[?&]season=(\d+)/i,
  ]);
  event.mediaType = inferPlaybackMediaType(event);
}

const AUTO_TRACK_RESOLUTION_TTL_MS = 60 * 60 * 1000;
const AUTO_TRACK_FAILURE_TTL_MS = 10 * 60 * 1000;
const autoTrackResolutionCache = new Map<string, {
  expiresAt: number;
  tmdbId: number | null;
}>();

async function resolveAutoTrackedIdentity(event: ProgressEvent, apiKey: string): Promise<void> {
  event.mediaType = inferPlaybackMediaType(event);
  if (event.tmdbId !== null && event.tmdbId !== undefined) return;
  if (!apiKey || event.mediaType === null) return;

  const query = playbackSearchTitle(event.title);
  const normalised = normaliseTitle(query);
  if (normalised.length < 2) return;

  const cacheKey = `${event.mediaType}|${normalised}`;
  const cached = autoTrackResolutionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.tmdbId !== null) event.tmdbId = cached.tmdbId;
    return;
  }

  try {
    const results = await unifiedSearch(query, apiKey, {
      includeMovies: event.mediaType === "movie",
      includeSeries: event.mediaType === "tv",
      includeAnime: false,
      includeManga: false,
      includeManhwa: false,
    });
    const exactMatches = results.filter((result) =>
      result.source === "tmdb"
      && result.tmdbId !== null
      && (event.mediaType === "movie" ? result.type === "movie" : result.type === "series")
      && normaliseTitle(result.title) === normalised
    );

    const yearMatch = event.title.match(/\b(19|20)\d{2}\b/)?.[0];
    const candidates = yearMatch
      ? exactMatches.filter((result) => result.year === Number.parseInt(yearMatch, 10))
      : exactMatches;
    const uniqueIds = new Set(candidates.map((result) => result.tmdbId));
    const resolved = uniqueIds.size === 1 ? candidates[0]?.tmdbId ?? null : null;

    autoTrackResolutionCache.set(cacheKey, {
      expiresAt: Date.now() + (resolved === null ? AUTO_TRACK_FAILURE_TTL_MS : AUTO_TRACK_RESOLUTION_TTL_MS),
      tmdbId: resolved,
    });
    if (resolved !== null) event.tmdbId = resolved;
  } catch {
    autoTrackResolutionCache.set(cacheKey, {
      expiresAt: Date.now() + AUTO_TRACK_FAILURE_TTL_MS,
      tmdbId: null,
    });
  }
}

function parseYear(value: string): number | null {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

async function createAutoTrackedItem(event: ProgressEvent, apiKey: string): Promise<ReelItem | null> {
  const tmdbId = event.tmdbId ?? null;
  const mediaType = event.mediaType ?? null;
  if (tmdbId === null || mediaType === null) return null;

  const progress = createDefaultProgress();
  try {
    if (apiKey && mediaType === "movie") {
      const details = await getMovieDetails(tmdbId, apiKey);
      return await listManager.add({
        id: `tmdb-${tmdbId}`,
        source: "tmdb",
        type: "movie",
        title: details.title || cleanPlaybackTitle(event.title),
        posterUrl: details.poster_path ? getPosterUrl(details.poster_path) : null,
        backdropUrl: details.backdrop_path ? getBackdropUrl(details.backdrop_path) : null,
        synopsis: details.overview || null,
        status: "watching",
        progress,
        rating: details.vote_average > 0 ? details.vote_average : null,
        genres: details.genres?.map((genre) => genre.name) ?? [],
        totalEpisodes: null,
        totalChapters: null,
        totalSeasons: null,
        year: parseYear(details.release_date),
        anilistId: null,
        tmdbId,
        mangadexId: null,
        malId: null,
        completedAt: null,
        lastWatchedSite: null,
      });
    }
    if (apiKey && mediaType === "tv") {
      const details = await getSeriesDetails(tmdbId, apiKey);
      const isAnime = details.original_language === "ja" && details.genres?.some((genre) => genre.name === "Animation");
      progress.totalEpisodes = details.number_of_episodes ?? null;
      progress.totalSeasons = details.number_of_seasons ?? null;
      return await listManager.add({
        id: `tmdb-${tmdbId}`,
        source: "tmdb",
        type: isAnime ? "anime" : "series",
        title: details.name || cleanPlaybackTitle(event.title),
        posterUrl: details.poster_path ? getPosterUrl(details.poster_path) : null,
        backdropUrl: details.backdrop_path ? getBackdropUrl(details.backdrop_path) : null,
        synopsis: details.overview || null,
        status: "watching",
        progress,
        rating: details.vote_average > 0 ? details.vote_average : null,
        genres: details.genres?.map((genre) => genre.name) ?? [],
        totalEpisodes: details.number_of_episodes ?? null,
        totalChapters: null,
        totalSeasons: details.number_of_seasons ?? null,
        year: parseYear(details.first_air_date),
        anilistId: null,
        tmdbId,
        mangadexId: null,
        malId: null,
        completedAt: null,
        lastWatchedSite: null,
      });
    }
  } catch (error) {
    console.warn("Pandora's Box could not enrich auto-tracked TMDB item", error);
  }

  const fallbackTitle = playbackSearchTitle(event.title) || `${mediaType === "movie" ? "Movie" : "Series"} ${tmdbId}`;
  try {
    return await listManager.add({
      id: `tmdb-${tmdbId}`,
      source: "tmdb",
      type: mediaType === "movie" ? "movie" : "series",
      title: fallbackTitle,
      posterUrl: null,
      backdropUrl: null,
      synopsis: null,
      status: "watching",
      progress,
      rating: null,
      genres: [],
      totalEpisodes: null,
      totalChapters: null,
      totalSeasons: null,
      year: null,
      anilistId: null,
      tmdbId,
      mangadexId: null,
      malId: null,
      completedAt: null,
      lastWatchedSite: null,
    });
  } catch {
    return (await listManager.getAll()).find((candidate) => candidate.tmdbId === tmdbId) ?? null;
  }
}

async function enrichAutoTrackedItem(item: ReelItem, apiKey: string): Promise<ReelItem> {
  if (!apiKey || item.tmdbId === null || (item.posterUrl && item.backdropUrl)) return item;
  try {
    if (item.type === "movie") {
      const details = await getMovieDetails(item.tmdbId, apiKey);
      return await listManager.update(item.id, {
        posterUrl: item.posterUrl ?? (details.poster_path ? getPosterUrl(details.poster_path) : null),
        backdropUrl: item.backdropUrl ?? (details.backdrop_path ? getBackdropUrl(details.backdrop_path) : null),
        synopsis: item.synopsis ?? details.overview ?? null,
        year: item.year ?? parseYear(details.release_date),
      });
    }
    if (item.type === "series" || item.type === "anime") {
      const details = await getSeriesDetails(item.tmdbId, apiKey);
      return await listManager.update(item.id, {
        posterUrl: item.posterUrl ?? (details.poster_path ? getPosterUrl(details.poster_path) : null),
        backdropUrl: item.backdropUrl ?? (details.backdrop_path ? getBackdropUrl(details.backdrop_path) : null),
        synopsis: item.synopsis ?? details.overview ?? null,
        totalEpisodes: item.totalEpisodes ?? details.number_of_episodes ?? null,
        totalSeasons: item.totalSeasons ?? details.number_of_seasons ?? null,
        year: item.year ?? parseYear(details.first_air_date),
      });
    }
  } catch (error) {
    console.warn("Pandora's Box could not backfill artwork for an auto-tracked item", error);
  }
  return item;
}

async function ensureAlarm(name: string, periodInMinutes: number): Promise<void> {
  const existing = await chrome.alarms.get(name);
  if (!existing) {
    await chrome.alarms.create(name, { periodInMinutes });
  }
}

async function ensureRuntimeInfrastructure(): Promise<void> {
  await ensureDefaultSettings();
  await Promise.all([
    ensureAlarm("episodeCheck", 60),
    ensureAlarm("chapterCheck", 60),
    ensureAlarm("progressSync", 15),
  ]);
}

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    try {
      await ensureRuntimeInfrastructure();
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } catch (error) {
      console.error("Pandora's Box onInstalled setup failed", error);
    }
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureRuntimeInfrastructure().catch((error) => {
    console.error("Pandora's Box startup setup failed", error);
  });
});

void ensureRuntimeInfrastructure().catch((error) => {
  console.error("Pandora's Box runtime setup failed", error);
});

function notify(id: string, title: string, message: string): void {
  try {
    chrome.notifications.create(id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title,
      message,
    });
  } catch (error) {
    console.error("Pandora's Box notification failed", error);
  }
}

async function runEpisodeCheck(): Promise<void> {
  const list = await listManager.getAll();
  const checker = new EpisodeChecker(listManager, getAiringScheduleCached, (id) =>
    withApiKey((key) => getSeriesDetails(id, key))
  );
  const results = await checker.checkForNewEpisodes(list);
  for (const result of results) {
    notify(
      `reel-episode-${result.itemId}-${result.newEpisode}`,
      `New episode: ${result.title}`,
      `Episode ${result.newEpisode} is out now. Open Pandora's Box to continue watching.`
    );
  }
}

async function runChapterCheck(): Promise<void> {
  const list = await listManager.getAll();
  const checker = new ChapterChecker(listManager, getLatestChapter);
  const results = await checker.checkForNewChapters(list);
  for (const result of results) {
    notify(
      `reel-chapter-${result.itemId}-${result.newChapter}`,
      `New chapter: ${result.title}`,
      `Chapter ${result.newChapter} is out now. Open Pandora's Box to keep reading.`
    );
  }
}

async function runSupabaseSync(): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();
  if (!settings.syncEnabled || !settings.supabaseUrl || !settings.supabaseAnonKey) {
    return { success: false, message: "Sync is not configured" };
  }
  try {
    const syncUserId = await getOrCreateSyncUserId();
    const sync = new SupabaseSync(settings.supabaseUrl, settings.supabaseAnonKey, syncUserId);
    const local = await listManager.getAll();
    const merged = await sync.sync(local);
    await replaceList(merged);
    return { success: true, message: `Synced ${merged.length} items` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Pandora's Box sync failed", error);
    return { success: false, message };
  }
}

async function scheduleProgressSyncSoon(): Promise<void> {
  const settings = await getSettings();
  if (!settings.syncEnabled || !settings.supabaseUrl || !settings.supabaseAnonKey) {
    return;
  }
  const pending = await chrome.alarms.get("progressSyncSoon");
  if (!pending) {
    await chrome.alarms.create("progressSyncSoon", { delayInMinutes: 2 });
  }
}

async function replaceList(list: ReelItem[]): Promise<void> {
  const existing = await listManager.getAll();
  for (const item of existing) {
    await listManager.remove(item.id);
  }
  for (const item of list) {
    const { addedAt, updatedAt, ...rest } = item;
    const added = await listManager.add(rest);
    await listManager.update(added.id, { addedAt, updatedAt } as Partial<ReelItem>);
  }
}

async function withApiKey<T>(fn: (key: string) => Promise<T>): Promise<T> {
  const settings = await getSettings();
  if (!settings.tmdbApiKey) {
    throw new Error("TMDB API key is not set. Add it in the Pandora's Box profile settings.");
  }
  return fn(settings.tmdbApiKey);
}

async function getAiringScheduleCached(
  mediaId: number
): Promise<{ airingAt: number; episode: number } | null> {
  const cacheKey = `airing-${mediaId}`;
  const cached = await cacheManager.get<{ airingAt: number; episode: number } | null>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  const fresh = await getAiringSchedule(mediaId);
  if (fresh !== null) {
    await cacheManager.set(cacheKey, fresh, 21600);
  }
  return fresh;
}

async function getAiringToday(): Promise<AiringTodayEntry[]> {
  const list = await listManager.getAll();
  const watching = list.filter(
    (item) => item.status === "watching" && item.type === "anime" && item.anilistId !== null
  );
  const entries: AiringTodayEntry[] = [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  for (const item of watching) {
    try {
      const airing = await getAiringScheduleCached(item.anilistId as number);
      if (airing === null) {
        continue;
      }
      const airingMs = airing.airingAt * 1000;
      if (airingMs >= startOfDay.getTime() && airingMs < endOfDay.getTime()) {
        entries.push({
          itemId: item.id,
          title: item.title,
          posterUrl: item.posterUrl,
          episode: airing.episode,
          airingAt: airing.airingAt,
        });
      }
    } catch {
      continue;
    }
  }
  return entries.sort((a, b) => a.airingAt - b.airingAt);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    try {
      if (alarm.name === "episodeCheck") {
        const settings = await getSettings();
        if (settings.notificationsEnabled) {
          await runEpisodeCheck();
        }
      } else if (alarm.name === "chapterCheck") {
        const settings = await getSettings();
        if (settings.notificationsEnabled) {
          await runChapterCheck();
        }
      } else if (alarm.name === "progressSync" || alarm.name === "progressSyncSoon") {
        await runSupabaseSync();
      }
    } catch (error) {
      console.error(`Pandora's Box alarm "${alarm.name}" failed`, error);
    }
  })();
});

async function handleMessage(message: ReelMessage, sender?: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case "saveProgress": {
      const event = { ...message.event };
      enrichProgressEventFromTab(event, sender);
      const cinejoyRoute = parseCinejoyPlayback(sender?.tab?.url);
      if (cinejoyRoute) {
        event.site = "cinejoy";
        event.url = sender?.tab?.url ?? event.url;
        event.tmdbId = cinejoyRoute.tmdbId;
        event.mediaType = cinejoyRoute.mediaType;
        event.seasonNumber = cinejoyRoute.seasonNumber;
        event.episodeNumber = cinejoyRoute.episodeNumber;
        const tabTitle = sender?.tab?.title ? cleanPlaybackTitle(sender.tab.title) : "";
        if (tabTitle) event.title = tabTitle;
      }
      if (event.itemId === null) {
        const settings = await getSettings();
        if (!settings.autoTrack) {
          return { success: false };
        }
        const list = await listManager.getAll();
        let match = progressManager.findMatchingItem(
          event.title,
          list,
          event.tmdbId ?? null,
          event.mediaType ?? null
        );
        if (!match) {
          await resolveAutoTrackedIdentity(event, settings.tmdbApiKey);
          match = progressManager.findMatchingItem(
            event.title,
            list,
            event.tmdbId ?? null,
            event.mediaType ?? null
          );
        }
        if (!match) {
          const created = await createAutoTrackedItem(event, settings.tmdbApiKey);
          if (!created) return { success: false };
          event.itemId = created.id;
        } else {
          if (!match.posterUrl || !match.backdropUrl) {
            match = await enrichAutoTrackedItem(match, settings.tmdbApiKey);
          }
          event.itemId = match.id;
        }
      }
      await progressManager.handleProgressEvent(event);
      void scheduleProgressSyncSoon().catch((error) => {
        console.error("Pandora's Box progress sync scheduling failed", error);
      });
      return { success: true };
    }
    case "getList":
      return listManager.getAll();
    case "getInProgress":
      return listManager.getInProgress();
    case "addItem":
      return listManager.add(message.item);
    case "updateItem":
      return listManager.update(message.id, message.updates);
    case "removeItem":
      await listManager.remove(message.id);
      return { success: true };
    case "markEpisodeWatched":
      return listManager.markEpisodeWatched(message.id, message.episode, message.season);
    case "markChapterRead":
      return listManager.markChapterRead(message.id, message.chapter);
    case "markComplete":
      return listManager.markComplete(message.id);
    case "updateProgress":
      return listManager.updateProgress(message.id, message.progress);
    case "getStats":
      return listManager.calculateStats();
    case "getSettings":
      return getSettings();
    case "updateSettings":
      return saveSettings(message.settings);
    case "search": {
      const settings = await getSettings();
      return unifiedSearch(message.query, settings.tmdbApiKey);
    }
    case "getWatchProviders": {
      const settings = await getSettings();
      let tmdbProviders = null;
      if (message.tmdbId !== null && settings.tmdbApiKey) {
        try {
          tmdbProviders =
            message.itemType === "movie"
              ? await getMovieWatchProviders(message.tmdbId, settings.country, settings.tmdbApiKey)
              : await getSeriesWatchProviders(message.tmdbId, settings.country, settings.tmdbApiKey);
        } catch (error) {
          console.error("Pandora's Box watch providers fetch failed", error);
        }
      }
      const params: Parameters<typeof getAllWatchOptions>[0] = {
        type: message.itemType,
        title: message.title,
        tmdbProviders,
      };
      if (message.mangadexId !== undefined) {
        params.mangaDexId = message.mangadexId;
      }
      return getAllWatchOptions(params);
    }
    case "getAiringToday":
      return getAiringToday();
    case "syncNow":
      return runSupabaseSync();
  }
}

const MESSAGE_TYPES = new Set<ReelMessage["type"]>([
  "saveProgress",
  "getList",
  "getInProgress",
  "addItem",
  "updateItem",
  "removeItem",
  "markEpisodeWatched",
  "markChapterRead",
  "markComplete",
  "updateProgress",
  "getStats",
  "getSettings",
  "updateSettings",
  "search",
  "getWatchProviders",
  "getAiringToday",
  "syncNow",
]);

function isAllowedMessage(message: unknown): message is ReelMessage {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as { type?: unknown };
  return typeof candidate.type === "string" && MESSAGE_TYPES.has(candidate.type as ReelMessage["type"]);
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void (async () => {
    try {
      if (sender.id !== chrome.runtime.id || !isAllowedMessage(message)) {
        throw new Error("Rejected untrusted extension message");
      }
      const result = await handleMessage(message, sender);
      sendResponse(result);
    } catch (error) {
      const errorResponse: ReelResponseError = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
      sendResponse(errorResponse);
    }
  })();
  return true;
});
