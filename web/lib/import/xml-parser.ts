import type { ReelItemStatus } from "@core/storage/schema";
import { normalizeTitle } from "./match";
import type { ImportMediaType, ParsedImportRow } from "./types";

export type { ParsedImportRow } from "./types";

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
      id: `mal-anime-${rows.length}`,
      originalText: title,
      title,
      year: null,
      typeHint: "anime",
      status: ANIME_STATUS[statusRaw] ?? null,
      progress: watched ? Number.parseInt(watched, 10) || null : null,
      duplicateOf: null,
    });
  }

  for (const node of Array.from(doc.querySelectorAll("manga"))) {
    const title = node.querySelector("series_title")?.textContent?.trim();
    if (!title) continue;
    const statusRaw = node.querySelector("my_status")?.textContent?.trim().toLowerCase() ?? "";
    const read = node.querySelector("my_read_chapters")?.textContent?.trim();
    rows.push({
      id: `mal-manga-${rows.length}`,
      originalText: title,
      title,
      year: null,
      typeHint: "manga",
      status: MANGA_STATUS[statusRaw] ?? null,
      progress: read ? Number.parseInt(read, 10) || null : null,
      duplicateOf: null,
    });
  }

  return rows;
}

const NUMBER_MARKER = /(?:^|\s)(?:\[(\d+)\]|(\d+)[.)])\s+/g;
const LEADING_MARKER = /^\s*(?:\[\d+\]|\d+[.)]|[-*•–—])\s+/;
const TRAILING_YEAR = /(?:\s*\((18(?:8[8-9]|9\d)|19\d{2}|20\d{2})\)|\s*[-,]\s*((?:18(?:8[8-9]|9\d)|19\d{2}|20\d{2})))\s*$/;

function splitNumberedText(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(NUMBER_MARKER));
  if (matches.length >= 2) {
    const numbers = matches.map((match) => Number(match[1] ?? match[2]));
    const ordered = numbers.slice(1).every((number, index) => number > numbers[index]!);
    if (ordered) {
      return matches
        .map((match, index) => {
          const start = match.index! + match[0].length;
          const end = matches[index + 1]?.index ?? normalized.length;
          return normalized.slice(start, end).trim();
        })
        .filter(Boolean);
    }
  }

  return normalized
    .split("\n")
    .map((line) => line.replace(LEADING_MARKER, "").trim())
    .filter(Boolean);
}

export function extractImportTitle(value: string): { title: string; year: number | null } {
  const cleaned = value.replace(LEADING_MARKER, "").trim();
  const match = cleaned.match(TRAILING_YEAR);
  const yearText = match?.[1] ?? match?.[2];
  const title = (match ? cleaned.slice(0, match.index) : cleaned).trim();
  return { title, year: yearText ? Number(yearText) : null };
}

export function parseTxtList(text: string, typeHint: ImportMediaType | null = "movie"): ParsedImportRow[] {
  const seen = new Map<string, string>();
  return splitNumberedText(text)
    .map((originalText, index) => {
      const { title, year } = extractImportTitle(originalText);
      const id = `paste-${index}-${normalizeTitle(title).slice(0, 24) || "title"}`;
      const key = `${normalizeTitle(title)}|${year ?? ""}|${typeHint ?? ""}`;
      const duplicateOf = seen.get(key) ?? null;
      if (!duplicateOf) seen.set(key, id);
      return {
        id,
        originalText,
        title,
        year,
        typeHint,
        status: null,
        progress: null,
        duplicateOf,
      } satisfies ParsedImportRow;
    })
    .filter((row) => row.title.length >= 2);
}
