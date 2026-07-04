import { NextResponse, type NextRequest } from "next/server";
import { runSearch } from "@/lib/search-server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "search", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await runSearch(q);
    return NextResponse.json({ results: results.slice(0, 12) });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
