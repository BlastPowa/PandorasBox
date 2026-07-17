import type { UnifiedSearchResult } from "@core/utils/search";
import type { ImportMediaType } from "./types";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function searchCandidates(
  query: string,
  options: { types?: ImportMediaType[]; year?: number | null; signal?: AbortSignal } = {}
): Promise<UnifiedSearchResult[]> {
  try {
    const params = new URLSearchParams({ q: query });
    if (options.types?.length) params.set("types", options.types.join(","));
    if (options.year) params.set("year", String(options.year));
    const res = await fetch(`/api/search?${params.toString()}`, { signal: options.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { results: UnifiedSearchResult[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}

export type MatchOutcome =
  | { kind: "matched"; result: UnifiedSearchResult }
  | { kind: "ambiguous"; candidates: UnifiedSearchResult[] }
  | { kind: "unmatched" };

/** Kept for the legacy importer while the unified review workspace rolls out. */
export function classifyCandidates(query: string, candidates: UnifiedSearchResult[]): MatchOutcome {
  if (candidates.length === 0) return { kind: "unmatched" };
  const norm = normalizeTitle(query);
  const sameTitle = candidates.filter((candidate) => normalizeTitle(candidate.title) === norm);
  if (sameTitle.length >= 2) return { kind: "ambiguous", candidates: sameTitle.slice(0, 8) };
  if (sameTitle.length === 1) return { kind: "matched", result: sameTitle[0] };
  return { kind: "matched", result: candidates[0]! };
}
