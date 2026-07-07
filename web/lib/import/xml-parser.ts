import type { ReelItemStatus } from "@core/storage/schema";

export interface ParsedImportRow {
  title: string;
  status: ReelItemStatus | null;
  progress: number | null;
}

const ANIME_STATUS: Record<string, ReelItemStatus> = {
  "watching": "watching",
  "completed": "completed",
  "on-hold": "on_hold",
  "dropped": "dropped",
  "plan to watch": "planned",
};

const MANGA_STATUS: Record<string, ReelItemStatus> = {
  "reading": "reading",
  "completed": "completed",
  "on-hold": "on_hold",
  "dropped": "dropped",
  "plan to read": "planned",
};

/**
 * Parses a MyAnimeList XML export (anime or manga list format).
 * Returns null if the file doesn't look like a MAL export.
 */
export function parseMalXml(xmlText: string): ParsedImportRow[] | null {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xmlText, "application/xml");
  } catch {
    return null;
  }
  if (doc.querySelector("parsererror")) return null;

  const root = doc.querySelector("myanimelist");
  if (!root) return null;

  const rows: ParsedImportRow[] = [];

  for (const node of Array.from(doc.querySelectorAll("anime"))) {
    const title = node.querySelector("series_title")?.textContent?.trim();
    if (!title) continue;
    const statusRaw = node.querySelector("my_status")?.textContent?.trim().toLowerCase() ?? "";
    const watched = node.querySelector("my_watched_episodes")?.textContent?.trim();
    rows.push({
      title,
      status: ANIME_STATUS[statusRaw] ?? null,
      progress: watched ? Number.parseInt(watched, 10) || null : null,
    });
  }

  for (const node of Array.from(doc.querySelectorAll("manga"))) {
    const title = node.querySelector("series_title")?.textContent?.trim();
    if (!title) continue;
    const statusRaw = node.querySelector("my_status")?.textContent?.trim().toLowerCase() ?? "";
    const read = node.querySelector("my_read_chapters")?.textContent?.trim();
    rows.push({
      title,
      status: MANGA_STATUS[statusRaw] ?? null,
      progress: read ? Number.parseInt(read, 10) || null : null,
    });
  }

  return rows;
}

export function parseTxtList(text: string): ParsedImportRow[] {
  return Array.from(
    new Set(
      text
        .split("\n")
        .map((l) => l.replace(/^\s*[-*\d.)\]]+\s*/, "").trim())
        .filter((l) => l.length >= 2)
    )
  )
    .slice(0, 200)
    .map((title) => ({ title, status: null, progress: null }));
}
