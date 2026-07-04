import { NextResponse, type NextRequest } from "next/server";
import { resolveImdbTarget } from "@/lib/imdb-ratings";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "episode-ratings-resolve", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "anilist" ? "anilist" : "tmdb";
  const tmdbIdParam = searchParams.get("tmdbId");
  const tmdbId = tmdbIdParam ? Number.parseInt(tmdbIdParam, 10) : null;
  const title = (searchParams.get("title") ?? "").slice(0, 200);

  if (!title) {
    return NextResponse.json({ target: null }, { status: 400 });
  }

  try {
    const target = await resolveImdbTarget({ source, tmdbId, title });
    return NextResponse.json({ target });
  } catch {
    return NextResponse.json({ target: null }, { status: 500 });
  }
}
