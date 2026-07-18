import type { ReelProgress, ReelItemType, ReelItemStatus } from "../storage/schema";

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const paddedSecs = secs.toString().padStart(2, "0");
  if (hours > 0) {
    const paddedMinutes = minutes.toString().padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSecs}`;
  }
  return `${minutes}:${paddedSecs}`;
}

export function formatProgress(progress: ReelProgress, type: ReelItemType): string {
  if (type === "movie") {
    if (progress.movieTimestamp !== null && progress.movieTimestamp > 0) {
      return `${formatRuntime(Math.floor(progress.movieTimestamp / 60))} in`;
    }
    return "Not started";
  }
  if (type === "series" || type === "anime") {
    const current = progress.currentEpisode ?? 0;
    if (progress.totalEpisodes !== null) {
      return `Episode ${current} of ${progress.totalEpisodes}`;
    }
    return `Episode ${current}`;
  }
  const currentChapter = progress.currentChapter ?? 0;
  if (type === "comic") {
    const issue = progress.currentIssueNumber ?? String(currentChapter);
    if (progress.totalChapters !== null) return `Issue ${issue} · ${currentChapter} of ${progress.totalChapters} read`;
    return `Issue ${issue}`;
  }
  if (progress.totalChapters !== null) {
    return `Chapter ${currentChapter} of ${progress.totalChapters}`;
  }
  return `Chapter ${currentChapter}`;
}

export function formatAirDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

export function getTypeLabel(type: ReelItemType): string {
  switch (type) {
    case "movie":
      return "Movie";
    case "series":
      return "Series";
    case "anime":
      return "Anime";
    case "manga":
      return "Manga";
    case "manhwa":
      return "Manhwa";
    case "comic":
      return "Comic";
  }
}

export function getStatusLabel(status: ReelItemStatus): string {
  switch (status) {
    case "watching":
      return "Watching";
    case "rewatching":
      return "Rewatching";
    case "reading":
      return "Reading";
    case "completed":
      return "Completed";
    case "on_hold":
      return "On Hold";
    case "dropped":
      return "Dropped";
    case "planned":
      return "Plan to Watch";
  }
}

export function getStatusColor(status: ReelItemStatus): string {
  switch (status) {
    case "watching":
      return "#00D4FF";
    case "rewatching":
      return "#c084fc";
    case "reading":
      return "#00FF88";
    case "completed":
      return "#22c55e";
    case "on_hold":
      return "#f59e0b";
    case "dropped":
      return "#ef4444";
    case "planned":
      return "#a855f7";
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
