import type { UnifiedSearchResult } from "@core/utils/search";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function searchCandidates(query: string): Promise<UnifiedSearchResult[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

/**
 * Decides whether a search query resolved cleanly, is ambiguous (multiple
 * plausible same-title candidates — e.g. "Bleach" matching several entries),
 * or found nothing. Never silently guesses when 2+ candidates share the title.
 */
export function classifyCandidates(query: string, candidates: UnifiedSearchResult[]): MatchOutcome {
  if (candidates.length === 0) return { kind: "unmatched" };
  const norm = normalizeTitle(query);
  const sameTitle = candidates.filter((c) => normalizeTitle(c.title) === norm);
  if (sameTitle.length >= 2) return { kind: "ambiguous", candidates: sameTitle.slice(0, 8) };
  if (sameTitle.length === 1) return { kind: "matched", result: sameTitle[0] };
  // No exact normalized match — fall back to the top result (best-effort),
  // it will still be revisable in the post-import "Unmatched"-style review.
  return { kind: "matched", result: candidates[0] };
}
