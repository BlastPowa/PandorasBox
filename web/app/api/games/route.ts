import { NextResponse, type NextRequest } from "next/server";
import { getGames, searchGames, type GameSort } from "@/lib/igdb";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SORTS: GameSort[] = ["popular", "top_rated", "upcoming", "new"];

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "games", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sortParam = searchParams.get("sort") ?? "popular";
  const sort = (SORTS.includes(sortParam as GameSort) ? sortParam : "popular") as GameSort;

  try {
    if (query && query.length >= 2) {
      const results = await searchGames(query);
      return NextResponse.json({ results });
    }
    const results = await getGames(sort);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load games", results: [] },
      { status: 500 }
    );
  }
}
