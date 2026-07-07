import { NextResponse, type NextRequest } from "next/server";
import { getRandomTitles, type RandomType } from "@/lib/random";
import type { GenreMode } from "@/lib/random-shared";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const TYPES: RandomType[] = ["any", "movie", "series", "kdrama", "anime", "manga"];
const MODES: GenreMode[] = ["any", "all"];

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "random", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "any";
  const type = (TYPES.includes(typeParam as RandomType) ? typeParam : "any") as RandomType;
  const modeParam = searchParams.get("mode") ?? "any";
  const mode = (MODES.includes(modeParam as GenreMode) ? modeParam : "any") as GenreMode;
  const genres = (searchParams.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g.length > 0 && g.length <= 40)
    .slice(0, 10);

  try {
    const results = await getRandomTitles({ type, genres, mode });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to open the box", results: [] },
      { status: 500 }
    );
  }
}
