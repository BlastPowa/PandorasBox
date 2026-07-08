import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { seedIndexIfSparse } from "@/lib/memory-search/seed";
import { guessTitlesFromDescription } from "@/lib/memory-search/gemini";
import { runSearch } from "@/lib/search-server";

interface MemorySearchRow {
  media_key: string;
  media_type: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  keywords: string[];
  rank: number;
}

export interface MemorySearchResult {
  id: string;
  type: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  confidence: number;
  matchedBecause: string[];
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "with", "about",
  "movie", "show", "film", "series", "where", "who", "that", "this", "is", "are",
  "was", "were", "it", "its", "his", "her", "their", "some", "one", "there",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Primary path: ask Gemini to recognize the title from world knowledge, then
 * resolve it to real metadata via the app's existing unified search — this is
 * what lets a description like "a world where time is life and currency"
 * correctly surface In Time, which keyword search never could. */
async function searchViaGemini(q: string): Promise<{ results: MemorySearchResult[]; budgetExceeded: boolean }> {
  const { titles, budgetExceeded } = await guessTitlesFromDescription(q);
  if (titles.length === 0) return { results: [], budgetExceeded };

  const results: MemorySearchResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < titles.length; i += 1) {
    const found = await runSearch(titles[i]);
    const best = found[0];
    if (!best || seen.has(best.id)) continue;
    seen.add(best.id);
    results.push({
      id: best.id,
      type: best.type,
      title: best.title,
      year: best.year,
      posterUrl: best.posterUrl,
      confidence: Math.max(40, 95 - i * 15),
      matchedBecause: ["recognized from your description"],
    });
  }
  return { results, budgetExceeded: false };
}

/** Fallback path: keyword full-text search over the site's own indexed
 * synopses/genres. Used when Gemini is unavailable or doesn't know the title
 * (e.g. very new or obscure releases it wasn't trained on). */
async function searchViaKeywordIndex(q: string): Promise<MemorySearchResult[]> {
  seedIndexIfSparse();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("memory_search", { query: q, max_results: 10 });
  if (error) return [];

  const rows = (data as MemorySearchRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const queryTokens = new Set(tokenize(q));
  const topRank = rows[0].rank || 1;

  return rows.map((r) => {
    const titleTokens = tokenize(r.title);
    const keywordTokens = r.keywords.map((k) => k.toLowerCase());
    const matched = new Set<string>();
    for (const t of queryTokens) {
      if (titleTokens.includes(t)) matched.add(t);
      for (const k of keywordTokens) {
        if (k.includes(t) || t.includes(k)) matched.add(k);
      }
    }
    return {
      id: r.media_key,
      type: r.media_type,
      title: r.title,
      year: r.year,
      posterUrl: r.poster_url,
      confidence: Math.max(5, Math.min(35, Math.round((r.rank / topRank) * 35))),
      matchedBecause: Array.from(matched).slice(0, 5),
    };
  });
}

export async function GET(request: NextRequest) {
  // Tight per-IP throttle: this endpoint can trigger a Gemini call, and the
  // shared free-tier quota (~20/day, 10/min for the whole project) is far
  // more scarce than typical API traffic — a generous per-IP limit here would
  // do nothing to stop one client (or a few concurrent users) from burning
  // the entire day's budget. The daily budget itself is enforced separately
  // and globally in guessTitlesFromDescription() via a shared DB counter.
  const limit = rateLimit(request, "memory-search", 5, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 500);
  if (q.length < 8) {
    return NextResponse.json({ results: [], error: "Describe it in a bit more detail." });
  }

  try {
    const { results: geminiResults, budgetExceeded } = await searchViaGemini(q);
    const keywordResults = await searchViaKeywordIndex(q).catch(() => []);

    const seen = new Set(geminiResults.map((r) => r.id));
    const merged = [...geminiResults, ...keywordResults.filter((r) => !seen.has(r.id))];

    return NextResponse.json({
      results: merged.slice(0, 10),
      notice: budgetExceeded
        ? "AI-powered search has hit its free daily limit — showing keyword matches instead. Try again tomorrow for smarter results."
        : undefined,
    });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
