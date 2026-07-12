export type ReelItemType = "movie" | "series" | "anime" | "manga" | "manhwa" | "comic";

export type ReelItemStatus =
  | "watching"
  | "reading"
  | "completed"
  | "on_hold"
  | "dropped"
  | "planned";

export interface ReelProgress {
  movieTimestamp: number | null;
  currentEpisode: number | null;
  currentSeason: number | null;
  episodeTimestamp: number | null;
  currentChapter: number | null;
  currentIssueId?: number | null;
  currentIssueNumber?: string | null;
  currentVolume: number | null;
  totalEpisodes: number | null;
  totalSeasons: number | null;
  totalChapters: number | null;
  totalVolumes: number | null;
  percentComplete: number;
}

export interface ReelItem {
  id: string;
  source: "tmdb" | "anilist" | "mangadex" | "comicvine";
  type: ReelItemType;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string | null;
  status: ReelItemStatus;
  progress: ReelProgress;
  rating: number | null;
  genres: string[];
  totalEpisodes: number | null;
  totalChapters: number | null;
  totalSeasons: number | null;
  year: number | null;
  anilistId: number | null;
  tmdbId: number | null;
  mangadexId: string | null;
  malId: number | null;
  addedAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastWatchedSite: string | null;
}

export interface ReelSettings {
  country: string;
  notificationsEnabled: boolean;
  autoTrack: boolean;
  theme: "dark";
  tmdbApiKey: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  syncEnabled: boolean;
}

export interface ReelCache {
  key: string;
  data: unknown;
  fetchedAt: number;
  ttlSeconds: number;
}

export function createDefaultProgress(): ReelProgress {
  return {
    movieTimestamp: null,
    currentEpisode: null,
    currentSeason: null,
    episodeTimestamp: null,
    currentChapter: null,
    currentIssueId: null,
    currentIssueNumber: null,
    currentVolume: null,
    totalEpisodes: null,
    totalSeasons: null,
    totalChapters: null,
    totalVolumes: null,
    percentComplete: 0,
  };
}

export function createDefaultSettings(): ReelSettings {
  return {
    country: "IE",
    notificationsEnabled: true,
    autoTrack: true,
    theme: "dark",
    tmdbApiKey: "",
    supabaseUrl: null,
    supabaseAnonKey: null,
    syncEnabled: false,
  };
}
