import { NextResponse, type NextRequest } from "next/server";
import { runSearch } from "@/lib/search-server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { IMPORT_MEDIA_TYPES, type ImportMediaType } from "@/lib/import/types";
import { rankImportCandidates } from "@/lib/import/ranking";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "search", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 150);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const requested = (params.get("types") ?? "")
    .split(",")
    .filter((type): type is ImportMediaType => IMPORT_MEDIA_TYPES.includes(type as ImportMediaType));
  const parsedYear = Number(params.get("year"));
  const year = Number.isInteger(parsedYear) && parsedYear >= 1888 && parsedYear <= 2099 ? parsedYear : null;
  try {
    const results = await runSearch(q, requested.length ? requested : undefined);
    const ranked = requested.length ? rankImportCandidates(q, year, results, requested).map((entry) => entry.result) : results;
    return NextResponse.json({ results: ranked.slice(0, 12) });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
