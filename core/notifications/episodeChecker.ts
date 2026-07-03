import type { ReelItem } from "../storage/schema";
import type { ListManager } from "../storage/listManager";
import type { TMDBSeries } from "../api/tmdb";

export interface EpisodeNotification {
  itemId: string;
  title: string;
  newEpisode: number;
  posterUrl: string | null;
}

export type GetAiringScheduleFn = (
  mediaId: number
) => Promise<{ airingAt: number; episode: number } | null>;

export type GetSeriesDetailsFn = (id: number) => Promise<TMDBSeries>;

export class EpisodeChecker {
  private listManager: ListManager;
  private getAiringSchedule: GetAiringScheduleFn;
  private getSeriesDetails: GetSeriesDetailsFn;

  constructor(
    listManager: ListManager,
    getAiringSchedule: GetAiringScheduleFn,
    getSeriesDetails: GetSeriesDetailsFn
  ) {
    this.listManager = listManager;
    this.getAiringSchedule = getAiringSchedule;
    this.getSeriesDetails = getSeriesDetails;
  }

  async checkForNewEpisodes(list: ReelItem[]): Promise<EpisodeNotification[]> {
    const notifications: EpisodeNotification[] = [];
    const candidates = list.filter(
      (item) => item.status === "watching" && (item.type === "anime" || item.type === "series")
    );

    for (const item of candidates) {
      try {
        if (item.type === "anime" && item.anilistId !== null) {
          const airing = await this.getAiringSchedule(item.anilistId);
          if (airing === null) {
            continue;
          }
          const currentEpisode = item.progress.currentEpisode ?? 0;
          const latestReleasedEpisode = airing.episode - 1;
          const nowSeconds = Math.floor(Date.now() / 1000);
          const nextEpisodeAired = airing.airingAt <= nowSeconds;
          const availableEpisode = nextEpisodeAired ? airing.episode : latestReleasedEpisode;
          if (availableEpisode > currentEpisode) {
            notifications.push({
              itemId: item.id,
              title: item.title,
              newEpisode: currentEpisode + 1,
              posterUrl: item.posterUrl,
            });
          }
        } else if (item.type === "series" && item.tmdbId !== null) {
          const details = await this.getSeriesDetails(item.tmdbId);
          const knownTotal = item.totalEpisodes ?? 0;
          if (details.number_of_episodes > knownTotal) {
            notifications.push({
              itemId: item.id,
              title: item.title,
              newEpisode: knownTotal + 1,
              posterUrl: item.posterUrl,
            });
          }
        }
      } catch {
        continue;
      }
    }

    return notifications;
  }
}
