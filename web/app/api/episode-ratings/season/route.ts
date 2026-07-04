import { NextResponse, type NextRequest } from "next/server";
import { getOmdbSeasonEpisodes } from "@/lib/imdb-ratings";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "episode-ratings-season", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const imdbId = (searchParams.get("imdbId") ?? "").slice(0, 20);
  const season = Number.parseInt(searchParams.get("season") ?? "1", 10);

  if (!/^tt\d+$/.test(imdbId) || Number.isNaN(season)) {
    return NextResponse.json({ episodes: [] }, { status: 400 });
  }

  try {
    const episodes = await getOmdbSeasonEpisodes(imdbId, season);
    return NextResponse.json({ episodes });
  } catch {
    return NextResponse.json({ episodes: [] }, { status: 500 });
  }
}
