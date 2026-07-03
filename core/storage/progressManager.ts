import type { ReelItem } from "./schema";
import type { ListManager } from "./listManager";
import { normaliseTitle } from "../utils/formatters";

export interface ProgressEvent {
  itemId: string | null;
  site: string;
  url: string;
  title: string;
  episodeNumber: number | null;
  seasonNumber: number | null;
  chapterNumber: number | null;
  timestamp: number | null;
  duration: number | null;
  percentComplete: number;
}

const COMPLETION_THRESHOLD_PERCENT = 92;

export class ProgressManager {
  private listManager: ListManager;

  constructor(listManager: ListManager) {
    this.listManager = listManager;
  }

  async handleProgressEvent(event: ProgressEvent): Promise<void> {
    if (event.itemId === null) {
      return;
    }
    const item = await this.listManager.getById(event.itemId);
    if (!item) {
      return;
    }

    const isReadingType = item.type === "manga" || item.type === "manhwa";

    if (event.percentComplete > COMPLETION_THRESHOLD_PERCENT) {
      if (isReadingType && event.chapterNumber !== null) {
        await this.listManager.markChapterRead(item.id, event.chapterNumber);
      } else if (!isReadingType && event.episodeNumber !== null) {
        await this.listManager.markEpisodeWatched(
          item.id,
          event.episodeNumber,
          event.seasonNumber ?? undefined
        );
      }
    } else {
      const progressUpdates: Parameters<ListManager["updateProgress"]>[1] = {};
      if (item.type === "movie") {
        progressUpdates.movieTimestamp = event.timestamp;
        progressUpdates.percentComplete = event.percentComplete;
      } else if (isReadingType) {
        if (event.chapterNumber !== null) {
          progressUpdates.currentChapter = event.chapterNumber;
        }
      } else {
        if (event.episodeNumber !== null) {
          progressUpdates.currentEpisode = event.episodeNumber;
        }
        if (event.seasonNumber !== null) {
          progressUpdates.currentSeason = event.seasonNumber;
        }
        progressUpdates.episodeTimestamp = event.timestamp;
      }
      await this.listManager.updateProgress(item.id, progressUpdates);
    }

    await this.listManager.update(item.id, { lastWatchedSite: event.site });
  }

  findMatchingItem(title: string, list: ReelItem[]): ReelItem | null {
    const normalisedTarget = normaliseTitle(title);
    if (normalisedTarget.length === 0) {
      return null;
    }

    for (const item of list) {
      if (normaliseTitle(item.title) === normalisedTarget) {
        return item;
      }
    }

    for (const item of list) {
      const normalisedItem = normaliseTitle(item.title);
      if (normalisedItem.length === 0) {
        continue;
      }
      if (normalisedTarget.includes(normalisedItem) || normalisedItem.includes(normalisedTarget)) {
        return item;
      }
    }

    const targetPrefix = normalisedTarget.slice(0, 20);
    if (targetPrefix.length >= 10) {
      for (const item of list) {
        if (normaliseTitle(item.title).slice(0, 20) === targetPrefix) {
          return item;
        }
      }
    }

    return null;
  }

  buildResumeUrl(item: ReelItem): string | null {
    if (!item.lastWatchedSite) {
      return null;
    }
    const site = item.lastWatchedSite.toLowerCase();
    const encodedTitle = encodeURIComponent(item.title);
    const timestamp = item.progress.episodeTimestamp ?? item.progress.movieTimestamp;

    switch (site) {
      case "netflix":
        return "https://www.netflix.com/browse";
      case "disneyplus":
        return "https://www.disneyplus.com/home";
      case "crunchyroll":
        return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
      case "cinemaos": {
        const base = `https://cinemaos.live/search?q=${encodedTitle}`;
        return timestamp !== null ? `${base}&t=${Math.floor(timestamp)}` : base;
      }
      case "nepu":
        return `https://nepu.to/search?q=${encodedTitle}`;
      case "aniwave":
        return `https://aniwave.to/filter?keyword=${encodedTitle}`;
      case "mangadex":
        return item.mangadexId
          ? `https://mangadex.org/title/${item.mangadexId}`
          : `https://mangadex.org/search?q=${encodedTitle}`;
      case "webtoon":
        return `https://www.webtoons.com/en/search?keyword=${encodedTitle}`;
      default:
        return null;
    }
  }
}
