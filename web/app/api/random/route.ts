import { NextResponse, type NextRequest } from "next/server";
import { getRandomTitles, type RandomType } from "@/lib/random";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const TYPES: RandomType[] = ["any", "movie", "series", "kdrama", "anime", "manga"];

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "random", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "any";
  const type = (TYPES.includes(typeParam as RandomType) ? typeParam : "any") as RandomType;
  const genre = searchParams.get("genre")?.slice(0, 40) ?? null;

  try {
    const results = await getRandomTitles({ type, genre: genre && genre.length > 0 ? genre : null });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to open the box", results: [] },
      { status: 500 }
    );
  }
}
