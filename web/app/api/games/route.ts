import { NextResponse, type NextRequest } from "next/server";
import { getGames, searchGames, type GameSort } from "@/lib/igdb";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SORTS: GameSort[] = ["popular", "most_played", "top_rated", "upcoming", "new"];
const PLATFORMS = new Set([6, 48, 49, 130, 167, 169]);
const GENRES = new Set([4, 5, 8, 12, 14, 15, 31, 32]);

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "games", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sortParam = searchParams.get("sort") ?? "popular";
  const sort = (SORTS.includes(sortParam as GameSort) ? sortParam : "popular") as GameSort;
  const platformValue = Number(searchParams.get("platform"));
  const genreValue = Number(searchParams.get("genre"));
  const yearValue = Number(searchParams.get("yearFrom"));
  const ratingValue = Number(searchParams.get("ratingMin"));
  const filters = {
    platform: PLATFORMS.has(platformValue) ? platformValue : null,
    genre: GENRES.has(genreValue) ? genreValue : null,
    yearFrom: Number.isInteger(yearValue) && yearValue >= 1970 && yearValue <= new Date().getUTCFullYear() + 2 ? yearValue : null,
    ratingMin: Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 9 ? ratingValue : null,
  };

  try {
    if (query && query.length >= 2) {
      const results = await searchGames(query);
      return NextResponse.json({ results });
    }
    const results = await getGames(sort, 36, filters);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load games", results: [] },
      { status: 500 }
    );
  }
}
