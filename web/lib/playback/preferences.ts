export type PlayerQualityPreference = "auto" | "1080p" | "720p" | "480p" | "360p";
export type PlayerSubtitlePreference = "auto" | "on" | "off";
export type PlayerDisplayMode = "fit" | "fill" | "stretch";
export type PlayerAspectRatio = "auto" | "16:9" | "4:3" | "21:9";

export interface PlayerPreferences {
  autoFallback: boolean;
  preferredQuality: PlayerQualityPreference;
  subtitles: PlayerSubtitlePreference;
  autoplayNext: boolean;
  playbackRate: number;
  displayMode: PlayerDisplayMode;
  aspectRatio: PlayerAspectRatio;
  dataSaver: boolean;
  completionThreshold: number;
  sourceOrder: string[];
}

export const PLAYER_PREFERENCES_KEY = "pbox-player-settings-v1";

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  autoFallback: true,
  preferredQuality: "auto",
  subtitles: "auto",
  autoplayNext: true,
  playbackRate: 1,
  displayMode: "fit",
  aspectRatio: "auto",
  dataSaver: false,
  completionThreshold: 90,
  sourceOrder: ["configured-feed", "peertube", "internet-archive", "wikimedia"],
};

export function readPlayerPreferences(): PlayerPreferences {
  if (typeof window === "undefined") return DEFAULT_PLAYER_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PLAYER_PREFERENCES_KEY);
    if (!raw) return DEFAULT_PLAYER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    return {
      ...DEFAULT_PLAYER_PREFERENCES,
      ...parsed,
      playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2].includes(Number(parsed.playbackRate))
        ? Number(parsed.playbackRate)
        : DEFAULT_PLAYER_PREFERENCES.playbackRate,
      displayMode: parsed.displayMode === "fill" || parsed.displayMode === "stretch" ? parsed.displayMode : "fit",
      aspectRatio: parsed.aspectRatio === "16:9" || parsed.aspectRatio === "4:3" || parsed.aspectRatio === "21:9" ? parsed.aspectRatio : "auto",
      dataSaver: Boolean(parsed.dataSaver),
      completionThreshold: Math.max(70, Math.min(100, Number(parsed.completionThreshold) || 90)),
      sourceOrder: Array.isArray(parsed.sourceOrder) && parsed.sourceOrder.length > 0
        ? parsed.sourceOrder.filter((value): value is string => typeof value === "string")
        : DEFAULT_PLAYER_PREFERENCES.sourceOrder,
    };
  } catch {
    return DEFAULT_PLAYER_PREFERENCES;
  }
}

export function writePlayerPreferences(preferences: PlayerPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Playback still works with in-memory settings if browser storage is unavailable.
  }
}
