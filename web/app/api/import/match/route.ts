import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { runSearch } from "@/lib/search-server";
import { assessImportMatch, rankImportCandidates } from "@/lib/import/ranking";
import { IMPORT_MEDIA_TYPES, type ImportMediaType } from "@/lib/import/types";

interface MatchRequestRow {
  id: string;
  title: string;
  year?: number | null;
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, worker: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (next < values.length) {
        const index = next++;
        results[index] = await worker(values[index]!);
      }
    })
  );
  return results;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const limit = rateLimit(request, `import-match:${user.id}`, 30, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const body = (await request.json().catch(() => null)) as { rows?: MatchRequestRow[]; types?: string[] } | null;
  if (!body?.rows?.length || body.rows.length > 20) {
    return NextResponse.json({ error: "Send between 1 and 20 titles per batch." }, { status: 400 });
  }
  const types = (body.types ?? ["movie"]).filter((type): type is ImportMediaType =>
    IMPORT_MEDIA_TYPES.includes(type as ImportMediaType)
  );
  if (!types.length) types.push("movie");
  const validRows = body.rows.every((row) =>
    typeof row.id === "string" && typeof row.title === "string" && row.title.trim().length >= 2 && row.title.length <= 150 &&
    (row.year == null || (Number.isInteger(row.year) && row.year >= 1888 && row.year <= 2099))
  );
  if (!validRows) return NextResponse.json({ error: "One or more titles are invalid." }, { status: 400 });

  const matches = await mapWithConcurrency(body.rows, 4, async (row) => {
    try {
      const candidates = await runSearch(row.title.trim(), types);
      const ranked = rankImportCandidates(row.title, row.year ?? null, candidates, types);
      const assessment = assessImportMatch(row.title, row.year ?? null, ranked);
      return {
        id: row.id,
        candidates: ranked.slice(0, 12).map((entry) => entry.result),
        selectedId: assessment.selected?.id ?? null,
        confidence: assessment.confidence,
        state: assessment.state,
        error: null,
      };
    } catch {
      return { id: row.id, candidates: [], selectedId: null, confidence: 0, state: "failed" as const, error: "Search failed. Retry this title." };
    }
  });

  return NextResponse.json({ matches });
}
