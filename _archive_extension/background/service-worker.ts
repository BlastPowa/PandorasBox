import { initManagers } from "../lib/chromeStorage";
import { getSettings, saveSettings, ensureDefaultSettings } from "../lib/settings";
import type { ReelMessage, ReelResponseError, AiringTodayEntry } from "../lib/messages";
import { EpisodeChecker } from "../../core/notifications/episodeChecker";
import { ChapterChecker } from "../../core/notifications/chapterChecker";
import { SupabaseSync } from "../../core/sync/supabase";
import { getAiringSchedule } from "../../core/api/anilist";
import { getSeriesDetails, getMovieWatchProviders, getSeriesWatchProviders } from "../../core/api/tmdb";
import { getLatestChapter } from "../../core/api/mangadex";
import { getAllWatchOptions } from "../../core/api/watchProviders";
import { unifiedSearch } from "../../core/utils/search";
import type { ReelItem } from "../../core/storage/schema";

const { listManager, progressManager, cacheManager } = initManagers();

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    try {
      await ensureDefaultSettings();
      await chrome.alarms.create("episodeCheck", { periodInMinutes: 60 });
      await chrome.alarms.create("chapterCheck", { periodInMinutes: 60 });
      await chrome.alarms.create("progressSync", { periodInMinutes: 15 });
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } catch (error) {
      console.error("Reel onInstalled setup failed", error);
    }
  })();
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
    console.error("Reel notification failed", error);
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
      `Episode ${result.newEpisode} is out now. Open Reel to continue watching.`
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
      `Chapter ${result.newChapter} is out now. Open Reel to keep reading.`
    );
  }
}

async function runSupabaseSync(): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();
  if (!settings.syncEnabled || !settings.supabaseUrl || !settings.supabaseAnonKey) {
    return { success: false, message: "Sync is not configured" };
  }
  try {
    const sync = new SupabaseSync(settings.supabaseUrl, settings.supabaseAnonKey, "reel-default-user");
    const local = await listManager.getAll();
    const merged = await sync.sync(local);
    await replaceList(merged);
    return { success: true, message: `Synced ${merged.length} items` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Reel sync failed", error);
    return { success: false, message };
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
    throw new Error("TMDB API key is not set. Add it in the Reel profile page settings.");
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
      } else if (alarm.name === "progressSync") {
        await runSupabaseSync();
      }
    } catch (error) {
      console.error(`Reel alarm "${alarm.name}" failed`, error);
    }
  })();
});

async function handleMessage(message: ReelMessage): Promise<unknown> {
  switch (message.type) {
    case "saveProgress": {
      const event = { ...message.event };
      if (event.itemId === null) {
        const settings = await getSettings();
        if (!settings.autoTrack) {
          return { success: false };
        }
        const list = await listManager.getAll();
        const match = progressManager.findMatchingItem(event.title, list);
        if (!match) {
          return { success: false };
        }
        event.itemId = match.id;
      }
      await progressManager.handleProgressEvent(event);
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
          console.error("Reel watch providers fetch failed", error);
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

chrome.runtime.onMessage.addListener((message: ReelMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      const result = await handleMessage(message);
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
