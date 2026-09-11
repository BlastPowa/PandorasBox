export type PlayerQualityPreference = "auto" | "1080p" | "720p" | "480p" | "360p";
export type PlayerSubtitlePreference = "auto" | "on" | "off";

export interface PlayerPreferences {
  autoFallback: boolean;
  preferredQuality: PlayerQualityPreference;
  subtitles: PlayerSubtitlePreference;
  autoplayNext: boolean;
  completionThreshold: number;
  sourceOrder: string[];
}

export const PLAYER_PREFERENCES_KEY = "pbox-player-settings-v1";

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  autoFallback: true,
  preferredQuality: "auto",
  subtitles: "auto",
  autoplayNext: true,
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
