import type { UnifiedSearchResult } from "@core/utils/search";
import { normalizeTitle } from "./match";
import type { ImportMediaType } from "./types";

export interface RankedCandidate {
  result: UnifiedSearchResult;
  points: number;
}

export function rankImportCandidates(
  title: string,
  year: number | null,
  candidates: UnifiedSearchResult[],
  types: ImportMediaType[]
): RankedCandidate[] {
  const wanted = normalizeTitle(title);
  const wantedTokens = new Set(wanted.split(" ").filter(Boolean));

  return candidates
    .map((result) => {
      const candidate = normalizeTitle(result.title);
      const candidateTokens = candidate.split(" ").filter(Boolean);
      const overlap = candidateTokens.filter((token) => wantedTokens.has(token)).length;
      const tokenScore = Math.round((overlap / Math.max(1, wantedTokens.size, candidateTokens.length)) * 35);
      let points = tokenScore;
      if (candidate === wanted) points += 100;
      else if (candidate.includes(wanted) || wanted.includes(candidate)) points += 35;
      if (types.includes(result.type as ImportMediaType)) points += 12;
      if (year && result.year) {
        const distance = Math.abs(year - result.year);
        if (distance === 0) points += 45;
        else if (distance === 1) points += 15;
        else if (distance <= 3) points += 5;
        else points -= Math.min(20, distance);
      }
      points += Math.round(Math.min(10, result.score ?? 0));
      return { result, points };
    })
    .sort((a, b) => b.points - a.points);
}

export function assessImportMatch(
  title: string,
  year: number | null,
  ranked: RankedCandidate[]
): { selected: UnifiedSearchResult | null; confidence: number; state: "ready" | "review" | "unmatched" } {
  if (!ranked.length) return { selected: null, confidence: 0, state: "unmatched" };
  const top = ranked[0]!;
  const second = ranked[1];
  const exactTitle = normalizeTitle(top.result.title) === normalizeTitle(title);
  const exactYear = year !== null && top.result.year === year;
  const margin = top.points - (second?.points ?? 0);
  const ready = exactTitle && (exactYear || margin >= 25);
  const confidence = Math.max(0, Math.min(100, Math.round((top.points / 170) * 100)));
  return { selected: ready ? top.result : top.result, confidence, state: ready ? "ready" : "review" };
}
