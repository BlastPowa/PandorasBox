import type { ReelItem, ReelItemStatus, ReelSettings, ReelProgress } from "../../core/storage/schema";
import type { ProgressEvent } from "../../core/storage/progressManager";
import type { ReelStats } from "../../core/storage/listManager";
import type { UnifiedSearchResult } from "../../core/utils/search";
import type { WatchOption } from "../../core/api/watchProviders";

export type ReelMessage =
  | { type: "saveProgress"; event: ProgressEvent }
  | { type: "getList" }
  | { type: "getInProgress" }
  | { type: "addItem"; item: Omit<ReelItem, "addedAt" | "updatedAt"> }
  | { type: "updateItem"; id: string; updates: Partial<ReelItem> }
  | { type: "removeItem"; id: string }
  | { type: "markEpisodeWatched"; id: string; episode: number; season?: number }
  | { type: "markChapterRead"; id: string; chapter: number }
  | { type: "markComplete"; id: string }
  | { type: "updateProgress"; id: string; progress: Partial<ReelProgress> }
  | { type: "getStats" }
  | { type: "getSettings" }
  | { type: "updateSettings"; settings: Partial<ReelSettings> }
  | { type: "search"; query: string }
  | {
      type: "getWatchProviders";
      tmdbId: number | null;
      itemType: "movie" | "series" | "anime" | "manga" | "manhwa";
      title: string;
      mangadexId?: string;
    }
  | { type: "getAiringToday" }
  | { type: "syncNow" };

export interface AiringTodayEntry {
  itemId: string;
  title: string;
  posterUrl: string | null;
  episode: number;
  airingAt: number;
}

export type ReelResponseMap = {
  saveProgress: { success: boolean };
  getList: ReelItem[];
  getInProgress: ReelItem[];
  addItem: ReelItem;
  updateItem: ReelItem;
  removeItem: { success: boolean };
  markEpisodeWatched: ReelItem;
  markChapterRead: ReelItem;
  markComplete: ReelItem;
  updateProgress: ReelItem;
  getStats: ReelStats;
  getSettings: ReelSettings;
  updateSettings: ReelSettings;
  search: UnifiedSearchResult[];
  getWatchProviders: WatchOption[];
  getAiringToday: AiringTodayEntry[];
  syncNow: { success: boolean; message: string };
};

export interface ReelResponseError {
  error: string;
}

export function sendMessage<T extends ReelMessage["type"]>(
  message: Extract<ReelMessage, { type: T }>
): Promise<ReelResponseMap[T]> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: ReelResponseMap[T] | ReelResponseError) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message ?? "Message failed"));
          return;
        }
        if (response && typeof response === "object" && "error" in response) {
          reject(new Error((response as ReelResponseError).error));
          return;
        }
        resolve(response as ReelResponseMap[T]);
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Message failed"));
    }
  });
}
