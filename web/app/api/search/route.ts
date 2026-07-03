import { NextResponse, type NextRequest } from "next/server";
import { runSearch } from "@/lib/search-server";

export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await runSearch(q);
    return NextResponse.json({ results: results.slice(0, 12) });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
