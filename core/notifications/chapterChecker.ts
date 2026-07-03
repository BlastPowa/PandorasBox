import type { ReelItem } from "../storage/schema";
import type { ListManager } from "../storage/listManager";
import type { MangaDexChapter } from "../api/mangadex";

export interface ChapterNotification {
  itemId: string;
  title: string;
  newChapter: string;
  posterUrl: string | null;
}

export type GetLatestChapterFn = (mangaId: string) => Promise<MangaDexChapter | null>;

export class ChapterChecker {
  private listManager: ListManager;
  private getLatestChapter: GetLatestChapterFn;

  constructor(listManager: ListManager, getLatestChapter: GetLatestChapterFn) {
    this.listManager = listManager;
    this.getLatestChapter = getLatestChapter;
  }

  async checkForNewChapters(list: ReelItem[]): Promise<ChapterNotification[]> {
    const notifications: ChapterNotification[] = [];
    const candidates = list.filter(
      (item) =>
        item.status === "reading" &&
        (item.type === "manga" || item.type === "manhwa") &&
        item.mangadexId !== null
    );

    for (const item of candidates) {
      try {
        const latest = await this.getLatestChapter(item.mangadexId as string);
        if (latest === null || latest.attributes.chapter === null) {
          continue;
        }
        const latestChapterNumber = Number.parseFloat(latest.attributes.chapter);
        if (Number.isNaN(latestChapterNumber)) {
          continue;
        }
        const currentChapter = item.progress.currentChapter ?? 0;
        if (latestChapterNumber > currentChapter) {
          notifications.push({
            itemId: item.id,
            title: item.title,
            newChapter: latest.attributes.chapter,
            posterUrl: item.posterUrl,
          });
        }
      } catch {
        continue;
      }
    }

    return notifications;
  }
}
