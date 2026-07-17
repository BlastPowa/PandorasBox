import type { ReelItemStatus } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";

export type ImportMediaType = "movie" | "series" | "anime" | "manga" | "comic";
export type ImportScope = ImportMediaType | "all";

export interface ParsedImportRow {
  id: string;
  originalText: string;
  title: string;
  year: number | null;
  typeHint: ImportMediaType | null;
  status: ReelItemStatus | null;
  progress: number | null;
  duplicateOf: string | null;
}

export type ImportResolutionState =
  | "matching"
  | "ready"
  | "review"
  | "unmatched"
  | "existing"
  | "skipped"
  | "failed";

export interface ImportReviewRow extends ParsedImportRow {
  candidates: UnifiedSearchResult[];
  selected: UnifiedSearchResult | null;
  confidence: number;
  resolutionState: ImportResolutionState;
  importStatus: ReelItemStatus;
  included: boolean;
  error: string | null;
}

export const IMPORT_MEDIA_TYPES: ImportMediaType[] = ["movie", "series", "anime", "manga", "comic"];

export function isReadingType(type: string | null | undefined): boolean {
  return type === "manga" || type === "manhwa" || type === "comic";
}
