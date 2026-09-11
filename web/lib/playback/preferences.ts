export type PlayerQualityPreference = "auto" | "1080p" | "720p" | "480p" | "360p";
export type PlayerSubtitlePreference = "auto" | "on" | "off";
export type PlayerDisplayMode = "fit" | "fill" | "stretch";
export type PlayerAspectRatio = "auto" | "16:9" | "4:3" | "21:9";
export type PlayerAccentColour = "brand" | "white" | "blue" | "red" | "violet" | "emerald" | "amber" | "pink" | "cyan";
export type PlayerIconStyle = "line" | "bold" | "soft";
export type PlayerUiScale = "small" | "medium" | "large" | "x-large" | "2x-large";
export type PlayerProgressStyle = "minimal" | "glow" | "gradient" | "neon";
export type PlayerDensity = "compact" | "normal" | "spacious";
export type PlayerControlsStyle = "low" | "raised" | "floating";
export type PlayerSeekPreviewStyle = "off" | "standard" | "large";
export type PlayerPausedInfoStyle = "hidden" | "compact" | "detailed";

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
  accentColour: PlayerAccentColour;
  iconStyle: PlayerIconStyle;
  uiScale: PlayerUiScale;
  progressStyle: PlayerProgressStyle;
  density: PlayerDensity;
  controlsStyle: PlayerControlsStyle;
  seekPreviewStyle: PlayerSeekPreviewStyle;
  pausedInfoStyle: PlayerPausedInfoStyle;
  glowControls: boolean;
  roundedControls: boolean;
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
  sourceOrder: ["jellyfin", "emby", "configured-feed", "peertube", "internet-archive", "wikimedia", "nasa"],
  accentColour: "brand",
  iconStyle: "line",
  uiScale: "medium",
  progressStyle: "minimal",
  density: "normal",
  controlsStyle: "raised",
  seekPreviewStyle: "standard",
  pausedInfoStyle: "hidden",
  glowControls: false,
  roundedControls: true,
};

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

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
      accentColour: isOneOf(parsed.accentColour, ["brand", "white", "blue", "red", "violet", "emerald", "amber", "pink", "cyan"] as const)
        ? parsed.accentColour
        : DEFAULT_PLAYER_PREFERENCES.accentColour,
      iconStyle: isOneOf(parsed.iconStyle, ["line", "bold", "soft"] as const)
        ? parsed.iconStyle
        : DEFAULT_PLAYER_PREFERENCES.iconStyle,
      uiScale: isOneOf(parsed.uiScale, ["small", "medium", "large", "x-large", "2x-large"] as const)
        ? parsed.uiScale
        : DEFAULT_PLAYER_PREFERENCES.uiScale,
      progressStyle: isOneOf(parsed.progressStyle, ["minimal", "glow", "gradient", "neon"] as const)
        ? parsed.progressStyle
        : DEFAULT_PLAYER_PREFERENCES.progressStyle,
      density: isOneOf(parsed.density, ["compact", "normal", "spacious"] as const)
        ? parsed.density
        : DEFAULT_PLAYER_PREFERENCES.density,
      controlsStyle: isOneOf(parsed.controlsStyle, ["low", "raised", "floating"] as const)
        ? parsed.controlsStyle
        : DEFAULT_PLAYER_PREFERENCES.controlsStyle,
      seekPreviewStyle: isOneOf(parsed.seekPreviewStyle, ["off", "standard", "large"] as const)
        ? parsed.seekPreviewStyle
        : DEFAULT_PLAYER_PREFERENCES.seekPreviewStyle,
      pausedInfoStyle: isOneOf(parsed.pausedInfoStyle, ["hidden", "compact", "detailed"] as const)
        ? parsed.pausedInfoStyle
        : DEFAULT_PLAYER_PREFERENCES.pausedInfoStyle,
      glowControls: typeof parsed.glowControls === "boolean" ? parsed.glowControls : DEFAULT_PLAYER_PREFERENCES.glowControls,
      roundedControls: typeof parsed.roundedControls === "boolean" ? parsed.roundedControls : DEFAULT_PLAYER_PREFERENCES.roundedControls,
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
