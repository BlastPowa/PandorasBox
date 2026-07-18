import type { ReelItem, ReelItemStatus, ReelItemType, ReelProgress } from "./schema";

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface ReelStats {
  totalItems: number;
  completed: number;
  watching: number;
  planned: number;
  dropped: number;
  totalWatchTimeMinutes: number;
  totalEpisodesWatched: number;
  totalChaptersRead: number;
  topGenres: { genre: string; count: number }[];
}

const AVERAGE_MOVIE_MINUTES = 100;
const AVERAGE_EPISODE_MINUTES = 24;

function calculatePercentComplete(progress: ReelProgress): number {
  if (progress.totalEpisodes !== null && progress.totalEpisodes > 0 && progress.currentEpisode !== null) {
    return Math.min(100, Math.max(0, (progress.currentEpisode / progress.totalEpisodes) * 100));
  }
  if (progress.totalChapters !== null && progress.totalChapters > 0 && progress.currentChapter !== null) {
    return Math.min(100, Math.max(0, (progress.currentChapter / progress.totalChapters) * 100));
  }
  return progress.percentComplete;
}

export class ListManager {
  private readonly STORAGE_KEY = "reel_list";
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private async save(list: ReelItem[]): Promise<void> {
    await this.adapter.setItem(this.STORAGE_KEY, JSON.stringify(list));
  }

  async getAll(): Promise<ReelItem[]> {
    const raw = await this.adapter.getItem(this.STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as ReelItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<ReelItem | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) ?? null;
  }

  async add(item: Omit<ReelItem, "addedAt" | "updatedAt">): Promise<ReelItem> {
    const list = await this.getAll();
    if (list.some((existing) => existing.id === item.id)) {
      throw new Error(`Item with id "${item.id}" already exists in the list`);
    }
    const now = new Date().toISOString();
    const fullItem: ReelItem = { ...item, addedAt: now, updatedAt: now };
    list.push(fullItem);
    await this.save(list);
    return fullItem;
  }

  async update(id: string, updates: Partial<ReelItem>): Promise<ReelItem> {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const existing = list[index] as ReelItem;
    const updated: ReelItem = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    await this.save(list);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const list = await this.getAll();
    await this.save(list.filter((item) => item.id !== id));
  }

  async updateProgress(id: string, progress: Partial<ReelProgress>): Promise<ReelItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const merged: ReelProgress = { ...item.progress, ...progress };
    merged.percentComplete = calculatePercentComplete(merged);
    return this.update(id, { progress: merged });
  }

  async markEpisodeWatched(id: string, episode: number, season?: number): Promise<ReelItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const merged: ReelProgress = {
      ...item.progress,
      currentEpisode: episode,
      currentSeason: season ?? item.progress.currentSeason,
    };
    merged.percentComplete = calculatePercentComplete(merged);
    const updates: Partial<ReelItem> = { progress: merged };
    if (merged.totalEpisodes !== null && episode >= merged.totalEpisodes) {
      merged.percentComplete = 100;
      updates.status = "completed";
      updates.completedAt = new Date().toISOString();
    }
    return this.update(id, updates);
  }

  async markChapterRead(id: string, chapter: number): Promise<ReelItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const merged: ReelProgress = {
      ...item.progress,
      currentChapter: chapter,
    };
    merged.percentComplete = calculatePercentComplete(merged);
    const updates: Partial<ReelItem> = { progress: merged };
    if (merged.totalChapters !== null && chapter >= merged.totalChapters) {
      merged.percentComplete = 100;
      updates.status = "completed";
      updates.completedAt = new Date().toISOString();
    }
    return this.update(id, updates);
  }

  async markComplete(id: string): Promise<ReelItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const merged: ReelProgress = { ...item.progress, percentComplete: 100 };
    return this.update(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      progress: merged,
    });
  }

  async getByStatus(status: ReelItemStatus): Promise<ReelItem[]> {
    const list = await this.getAll();
    return list.filter((item) => item.status === status);
  }

  async getByType(type: ReelItemType): Promise<ReelItem[]> {
    const list = await this.getAll();
    return list.filter((item) => item.type === type);
  }

  async getRecentlyUpdated(limit?: number): Promise<ReelItem[]> {
    const list = await this.getAll();
    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit ?? 10);
  }

  async getInProgress(): Promise<ReelItem[]> {
    const list = await this.getAll();
    return list
      .filter(
        (item) =>
          (item.status === "watching" || item.status === "rewatching" || item.status === "reading") &&
          item.progress.percentComplete > 0 &&
          item.progress.percentComplete < 100
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async calculateStats(): Promise<ReelStats> {
    const list = await this.getAll();
    const stats: ReelStats = {
      totalItems: list.length,
      completed: 0,
      watching: 0,
      planned: 0,
      dropped: 0,
      totalWatchTimeMinutes: 0,
      totalEpisodesWatched: 0,
      totalChaptersRead: 0,
      topGenres: [],
    };
    const genreCounts = new Map<string, number>();

    for (const item of list) {
      if (item.status === "completed") {
        stats.completed += 1;
      } else if (item.status === "watching" || item.status === "rewatching" || item.status === "reading") {
        stats.watching += 1;
      } else if (item.status === "planned") {
        stats.planned += 1;
      } else if (item.status === "dropped") {
        stats.dropped += 1;
      }

      for (const genre of item.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }

      if (item.type === "movie") {
        if (item.status === "completed") {
          stats.totalWatchTimeMinutes += AVERAGE_MOVIE_MINUTES;
        }
      } else if (item.type === "series" || item.type === "anime") {
        const episodesWatched =
          item.status === "completed"
            ? item.totalEpisodes ?? item.progress.currentEpisode ?? 0
            : item.progress.currentEpisode ?? 0;
        stats.totalEpisodesWatched += episodesWatched;
        stats.totalWatchTimeMinutes += episodesWatched * AVERAGE_EPISODE_MINUTES;
      } else {
        const chaptersRead =
          item.status === "completed"
            ? item.totalChapters ?? item.progress.currentChapter ?? 0
            : item.progress.currentChapter ?? 0;
        stats.totalChaptersRead += chaptersRead;
      }
    }

    stats.topGenres = Array.from(genreCounts.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  }
}
