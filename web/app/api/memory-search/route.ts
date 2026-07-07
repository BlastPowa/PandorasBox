import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { seedIndexIfSparse } from "@/lib/memory-search/seed";

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

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "memory-search", 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 500);
  if (q.length < 8) {
    return NextResponse.json({ results: [], error: "Describe it in a bit more detail." });
  }

  seedIndexIfSparse();

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("memory_search", { query: q, max_results: 10 });
    if (error) throw error;

    const rows = (data as MemorySearchRow[] | null) ?? [];
    if (rows.length === 0) return NextResponse.json({ results: [] });

    const queryTokens = new Set(tokenize(q));
    const topRank = rows[0].rank || 1;

    const results: MemorySearchResult[] = rows.map((r) => {
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
        confidence: Math.max(5, Math.min(100, Math.round((r.rank / topRank) * 100))),
        matchedBecause: Array.from(matched).slice(0, 5),
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
